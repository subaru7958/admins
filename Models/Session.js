import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    type: {
      type: String,
      enum: ['yearly', 'monthly'],
      default: 'yearly',
    },
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    }],
    coaches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
    }],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure end date is after start date
sessionSchema.pre('save', function(next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;