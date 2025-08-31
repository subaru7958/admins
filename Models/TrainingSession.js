import mongoose from 'mongoose';

const trainingSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Training session title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: [true, 'Day of week is required'],
    },
    location: {
      type: String,
      default: '',
    },
    group: {
      type: String,
      enum: ['Minimum', 'Cadet', 'Junior', 'Senior'],
      default: 'Minimum',
    },
    subgroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subgroup',
      default: null,
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true,
    },
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    }],
    isWeekly: {
      type: Boolean,
      default: false,
      index: true,
    },
    attendance: [{
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
      },
      status: {
        type: String,
        enum: ['present', 'absent', 'late'],
        default: 'absent',
      },
      timestamp: {
        type: Date,
        default: null,
      },
    }],
  },
  { timestamps: true }
);

const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);

export default TrainingSession;