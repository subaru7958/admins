import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    group: {
      type: String,
      enum: ['Poussin', 'Ecole', 'Minimum', 'Cadet', 'Junior', 'Senior'],
      default: 'Minimum',
    },
    subgroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subgroup',
      default: null,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    positions: [{
      type: String,
      trim: true,
    }],
    jerseyNumber: {
      type: Number,
      min: [0, 'Jersey number cannot be negative'],
      default: 0,
    },
    heightCm: {
      type: Number,
      min: [0, 'Height cannot be negative'],
      default: 0,
    },
    weightKg: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: 0,
    },
    inscriptionFee: {
      type: Number,
      default: 0,
      min: [0, 'Inscription fee cannot be negative'],
    },
    inscriptionPaidAt: {
      type: Date,
      default: null,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: [0, 'Monthly fee cannot be negative'],
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    photo: {
      type: String,
      default: '',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
  },
  { timestamps: true }
);

const Player = mongoose.model('Player', playerSchema);

export default Player;
