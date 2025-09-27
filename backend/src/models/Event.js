import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Event capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10,000']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Event date must be in the future'
    }
  },
  venue: {
    type: String,
    required: [true, 'Event venue is required'],
    trim: true,
    maxlength: [300, 'Venue cannot exceed 300 characters']
  },
  attendeesCount: {
    type: Number,
    default: 0,
    min: [0, 'Attendees count cannot be negative']
  },
  // Additional event metadata
  category: {
    type: String,
    enum: ['hackathon', 'workshop', 'seminar', 'conference', 'networking', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  registrationDeadline: {
    type: Date
  },
  // Event organizer info
  organizer: {
    name: String,
    email: String,
    phone: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available seats
eventSchema.virtual('availableSeats').get(function() {
  return Math.max(0, this.capacity - this.attendeesCount);
});

// Virtual for registration status
eventSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  const registrationDeadline = this.registrationDeadline || this.date;
  return this.isActive && now < registrationDeadline && this.attendeesCount < this.capacity;
});

// Indexes for performance
eventSchema.index({ date: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isActive: 1, date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ tags: 1 });

// Pre-save middleware to validate registration deadline
eventSchema.pre('save', function(next) {
  if (this.registrationDeadline && this.registrationDeadline > this.date) {
    next(new Error('Registration deadline cannot be after event date'));
  } else {
    next();
  }
});

// Static method to get events with registration stats
eventSchema.statics.getEventsWithStats = async function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        as: 'registrations'
      }
    },
    {
      $addFields: {
        confirmedCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'confirmed'] }
            }
          }
        },
        waitingCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'waiting'] }
            }
          }
        }
      }
    },
    {
      $project: {
        registrations: 0
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);
};

export default mongoose.model('Event', eventSchema);
