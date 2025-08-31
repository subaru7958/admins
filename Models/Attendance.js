import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    trainingSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingSession',
      required: [true, 'Training session is required'],
      index: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
      required: [true, 'Attendance status is required'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      required: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to ensure one attendance record per player per training session
attendanceSchema.index({ trainingSession: 1, player: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
