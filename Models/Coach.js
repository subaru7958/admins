import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
      default: 0,
    },
    agreedSalary: {
      type: Number,
      min: [0, 'Agreed salary cannot be negative'],
      default: 0,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    photo: {
      type: String,
      default: '', // URL path to uploaded image (e.g., /uploads/filename.jpg)
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true,
    },
    // Group/subgroup are assigned later via training session plans
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
  },
  { timestamps: true }
);

// Create compound index for email and team to ensure uniqueness within team
coachSchema.index({ email: 1, team: 1 }, { unique: true });

const Coach = mongoose.model('Coach', coachSchema);

export default Coach;