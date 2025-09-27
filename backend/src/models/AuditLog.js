import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId ref to Admin or string for system actions
    required: [true, 'Actor is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // Registration actions
      'registration.create',
      'registration.promote',
      'registration.cancel',
      'registration.update',
      'registration.import',
      
      // Event actions
      'event.create',
      'event.update',
      'event.delete',
      'event.export',
      
      // Admin actions
      'admin.login',
      'admin.logout',
      'admin.create',
      'admin.update',
      'admin.delete',
      
      // System actions
      'system.auto_promote',
      'system.cleanup',
      'system.backup'
    ]
  },
  target: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId ref to Registration, Event, etc.
    required: false
  },
  targetType: {
    type: String,
    enum: ['Registration', 'Event', 'Admin', 'System'],
    required: function() {
      return this.target != null;
    }
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
    default: {}
  },
  // Request context
  context: {
    ipAddress: String,
    userAgent: String,
    endpoint: String,
    method: String
  },
  // Outcome of the action
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  errorMessage: String
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt for audit logs
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ target: 1, createdAt: -1 });
auditLogSchema.index({ result: 1 });

// Virtual to populate actor details if it's an ObjectId
auditLogSchema.virtual('actorDetails', {
  ref: 'Admin',
  localField: 'actor',
  foreignField: '_id',
  justOne: true,
  match: { _id: { $type: 'objectId' } }
});

// Virtual to populate target details based on targetType
auditLogSchema.virtual('targetDetails', {
  refPath: 'targetType',
  localField: 'target',
  foreignField: '_id',
  justOne: true
});

// Static method to log an action
auditLogSchema.statics.logAction = async function({
  actor,
  action,
  target = null,
  targetType = null,
  details = {},
  context = {},
  result = 'success',
  errorMessage = null
}) {
  try {
    const logEntry = new this({
      actor,
      action,
      target,
      targetType,
      details,
      context,
      result,
      errorMessage
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    // Don't throw errors for audit logging to avoid breaking main operations
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to get audit logs with filters
auditLogSchema.statics.getAuditLogs = async function({
  actor = null,
  action = null,
  target = null,
  startDate = null,
  endDate = null,
  result = null,
  page = 1,
  limit = 50
}) {
  const query = {};
  
  if (actor) query.actor = actor;
  if (action) query.action = action;
  if (target) query.target = target;
  if (result) query.result = result;
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    this.find(query)
      .populate('actorDetails', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method to get audit summary
auditLogSchema.statics.getAuditSummary = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summary = await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          action: '$action',
          result: '$result'
        },
        count: { $sum: 1 },
        latestActivity: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        total: { $sum: '$count' },
        success: {
          $sum: {
            $cond: [{ $eq: ['$_id.result', 'success'] }, '$count', 0]
          }
        },
        failure: {
          $sum: {
            $cond: [{ $eq: ['$_id.result', 'failure'] }, '$count', 0]
          }
        },
        latestActivity: { $max: '$latestActivity' }
      }
    },
    { $sort: { total: -1 } }
  ]);
  
  return summary;
};

export default mongoose.model('AuditLog', auditLogSchema);
