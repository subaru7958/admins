import mongoose from 'mongoose';
import { hashPassword, comparePassword } from '../utils/authUtils.js';

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters long']
  },
  discipline: {
    type: String,
    required: [true, 'Discipline is required'],
    enum: {
      values: ['Football', 'Natation', 'Handball'],
      message: 'Discipline must be either Football, Natation, or Handball'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  logo: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false // Disable timestamps since we only want createdAt
});

// Hash password before saving
teamSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Use the utility function to hash password
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password using utility function
teamSchema.methods.comparePassword = async function(candidatePassword) {
  return await comparePassword(candidatePassword, this.password);
};

// Method to get public profile (without password)
teamSchema.methods.toPublicJSON = function() {
  const teamObject = this.toObject();
  delete teamObject.password;
  return teamObject;
};

const Team = mongoose.model('Team', teamSchema);

export default Team; 