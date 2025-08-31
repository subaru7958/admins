import mongoose from 'mongoose';

const subgroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subgroup name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Poussin', 'Ecole', 'Minimum', 'Cadet', 'Junior', 'Senior'],
      required: [true, 'Category is required'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true,
    },
    coaches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
    }],
    players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    }],
    description: {
      type: String,
      default: '',
    },
    maxPlayers: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure unique subgroup names within the same session and category
subgroupSchema.index({ name: 1, category: 1, session: 1, team: 1 }, { unique: true });

const Subgroup = mongoose.model('Subgroup', subgroupSchema);

export default Subgroup;
