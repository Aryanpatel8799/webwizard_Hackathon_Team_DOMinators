import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event reference is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        return !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
      },
      message: 'Please enter a valid phone number'
    }
  },
  college: {
    type: String,
    trim: true,
    maxlength: [200, 'College name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['confirmed', 'waiting', 'cancelled'],
      message: 'Status must be either confirmed, waiting, or cancelled'
    },
    default: 'waiting',
    index: true
  },
  ticketQR: {
    type: String, // Will store data URL or file path
  },
  // Additional registration info
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  // Metadata for tracking and analytics
  meta: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'import'],
      default: 'web'
    }
  },
  // Timestamps for different status changes
  statusHistory: [{
    status: {
      type: String,
      enum: ['confirmed', 'waiting', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  // Communication preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate confirmed registrations for same event
registrationSchema.index(
  { event: 1, email: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { status: { $ne: 'cancelled' } }
  }
);

// Additional indexes for performance
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ status: 1, createdAt: -1 });

// Virtual for position in waiting list
registrationSchema.virtual('waitingPosition').get(function() {
  // This will be calculated separately in queries when needed
  return this._waitingPosition;
});

// Pre-save middleware to generate registration number
registrationSchema.pre('save', function(next) {
  if (this.isNew && !this.registrationNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.registrationNumber = `REG-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Pre-save middleware to track status changes
registrationSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      reason: this._statusChangeReason || 'Status updated'
    });
  }
  next();
});

// Static method to get waiting list position
registrationSchema.statics.getWaitingPosition = async function(eventId, registrationId) {
  const registrations = await this.find({
    event: eventId,
    status: 'waiting'
  }).sort({ createdAt: 1 });
  
  const position = registrations.findIndex(reg => reg._id.toString() === registrationId.toString());
  return position !== -1 ? position + 1 : null;
};

// Static method to find next in waiting list
registrationSchema.statics.findNextInWaitingList = async function(eventId) {
  return this.findOne({
    event: eventId,
    status: 'waiting'
  }).sort({ createdAt: 1 });
};

// Static method to get registration stats for an event
registrationSchema.statics.getEventStats = async function(eventId) {
  const stats = await this.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    confirmed: 0,
    waiting: 0,
    cancelled: 0,
    total: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

export default mongoose.model('Registration', registrationSchema);
