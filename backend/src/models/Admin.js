import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't return password hash by default
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'superadmin', 'moderator'],
      message: 'Role must be admin, superadmin, or moderator'
    },
    default: 'admin'
  },
  // Additional admin info
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    events: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    registrations: {
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    admin: {
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  // Session and security info
  lastLoginAt: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  passwordChangedAt: Date,
  // Contact info
  phone: String,
  department: String
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.passwordHash;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Index for performance (email index is already created by unique: true)
adminSchema.index({ isActive: 1 });
adminSchema.index({ role: 1 });

// Virtual for full permissions based on role
adminSchema.virtual('effectivePermissions').get(function() {
  const permissions = { ...this.permissions };
  
  // Superadmin gets all permissions
  if (this.role === 'superadmin') {
    return {
      events: { create: true, read: true, update: true, delete: true },
      registrations: { create: true, read: true, update: true, delete: true },
      admin: { read: true, create: true, update: true, delete: true },
      analytics: { read: true }
    };
  }
  
  return permissions;
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('passwordHash')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update login info
adminSchema.pre('save', function(next) {
  if (this.isModified('lastLoginAt')) {
    this.loginCount += 1;
  }
  next();
});

// Instance method to check password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if password was changed after JWT was issued
adminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  
  // False means NOT changed
  return false;
};

// Static method to create admin with hashed password
adminSchema.statics.createAdmin = async function(adminData) {
  const admin = new this(adminData);
  await admin.save();
  return admin;
};

// Static method to find active admin by email
adminSchema.statics.findActiveByEmail = async function(email) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    isActive: true 
  }).select('+passwordHash');
};

export default mongoose.model('Admin', adminSchema);
