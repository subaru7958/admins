import Subgroup from '../Models/Subgroup.js';
import Player from '../Models/Player.js';
import Coach from '../Models/Coach.js';
import Session from '../Models/Session.js';

// Get all subgroups for a session
export const getSubgroupsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teamId = req.user?.id || req.user?._id || req.query.teamId || req.body.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const subgroups = await Subgroup.find({ 
      session: sessionId, 
      team: teamId 
    })
    .populate('coaches', 'fullName email specialization')
    .populate('players', 'fullName dateOfBirth group')
    .sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: subgroups.length,
      data: subgroups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subgroups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new subgroup
export const createSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { sessionId } = req.params;
    const { name, category, description, maxPlayers } = req.body;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Verify session exists and belongs to team
    const session = await Session.findOne({ _id: sessionId, team: teamId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if subgroup name already exists for this category and session
    const existingSubgroup = await Subgroup.findOne({
      name,
      category,
      session: sessionId,
      team: teamId
    });

    if (existingSubgroup) {
      return res.status(400).json({
        success: false,
        message: 'A subgroup with this name already exists for this category and session'
      });
    }

    const subgroup = await Subgroup.create({
      name,
      category,
      session: sessionId,
      team: teamId,
      description: description || '',
      maxPlayers: maxPlayers || 0
    });

    const populatedSubgroup = await Subgroup.findById(subgroup._id)
      .populate('coaches', 'fullName email specialization')
      .populate('players', 'fullName dateOfBirth group');

    res.status(201).json({
      success: true,
      message: 'Subgroup created successfully',
      data: populatedSubgroup
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update subgroup
export const updateSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId } = req.params;
    const { name, description, maxPlayers, isActive } = req.body;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;
    if (isActive !== undefined) updates.isActive = isActive;

    const subgroup = await Subgroup.findOneAndUpdate(
      { _id: subgroupId, team: teamId },
      updates,
      { new: true, runValidators: true }
    )
    .populate('coaches', 'fullName email specialization')
    .populate('players', 'fullName dateOfBirth group');

    if (!subgroup) {
      return res.status(404).json({
        success: false,
        message: 'Subgroup not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subgroup updated successfully',
      data: subgroup
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete subgroup
export const deleteSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const subgroup = await Subgroup.findOneAndDelete({
      _id: subgroupId,
      team: teamId
    });

    if (!subgroup) {
      return res.status(404).json({
        success: false,
        message: 'Subgroup not found'
      });
    }

    // Remove players from this subgroup
    await Player.updateMany(
      { _id: { $in: subgroup.players } },
      { $unset: { subgroup: 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Subgroup deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Assign player to subgroup
export const assignPlayerToSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId, playerId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Verify subgroup exists and belongs to team
    const subgroup = await Subgroup.findOne({ _id: subgroupId, team: teamId });
    if (!subgroup) {
      return res.status(404).json({
        success: false,
        message: 'Subgroup not found'
      });
    }

    // Verify player exists and belongs to team
    const player = await Player.findOne({ _id: playerId, team: teamId });
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check if player is already in this subgroup
    if (subgroup.players.includes(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Player is already assigned to this subgroup'
      });
    }

    // Check if subgroup has reached max capacity
    if (subgroup.maxPlayers > 0 && subgroup.players.length >= subgroup.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Subgroup has reached maximum capacity'
      });
    }

    // Remove player from any other subgroups in the same session
    await Subgroup.updateMany(
      { 
        session: subgroup.session, 
        team: teamId,
        players: playerId 
      },
      { $pull: { players: playerId } }
    );

    // Add player to this subgroup
    await Subgroup.findByIdAndUpdate(
      subgroupId,
      { $addToSet: { players: playerId } }
    );

    // Update player's subgroup field
    await Player.findByIdAndUpdate(
      playerId,
      { subgroup: subgroupId }
    );

    const updatedSubgroup = await Subgroup.findById(subgroupId)
      .populate('coaches', 'fullName email specialization')
      .populate('players', 'fullName dateOfBirth group');

    res.status(200).json({
      success: true,
      message: 'Player assigned to subgroup successfully',
      data: updatedSubgroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while assigning player to subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove player from subgroup
export const removePlayerFromSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId, playerId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Remove player from subgroup
    await Subgroup.findByIdAndUpdate(
      subgroupId,
      { $pull: { players: playerId } }
    );

    // Clear player's subgroup field
    await Player.findByIdAndUpdate(
      playerId,
      { $unset: { subgroup: 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Player removed from subgroup successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while removing player from subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Assign coach to subgroup
export const assignCoachToSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId, coachId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Verify subgroup exists and belongs to team
    const subgroup = await Subgroup.findOne({ _id: subgroupId, team: teamId });
    if (!subgroup) {
      return res.status(404).json({
        success: false,
        message: 'Subgroup not found'
      });
    }

    // Verify coach exists and belongs to team
    const coach = await Coach.findOne({ _id: coachId, team: teamId });
    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // Check if coach is already in this subgroup
    if (subgroup.coaches.includes(coachId)) {
      return res.status(400).json({
        success: false,
        message: 'Coach is already assigned to this subgroup'
      });
    }

    // Add coach to subgroup
    await Subgroup.findByIdAndUpdate(
      subgroupId,
      { $addToSet: { coaches: coachId } }
    );

    const updatedSubgroup = await Subgroup.findById(subgroupId)
      .populate('coaches', 'fullName email specialization')
      .populate('players', 'fullName dateOfBirth group');

    res.status(200).json({
      success: true,
      message: 'Coach assigned to subgroup successfully',
      data: updatedSubgroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while assigning coach to subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove coach from subgroup
export const removeCoachFromSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId, coachId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Remove coach from subgroup
    await Subgroup.findByIdAndUpdate(
      subgroupId,
      { $pull: { coaches: coachId } }
    );

    res.status(200).json({
      success: true,
      message: 'Coach removed from subgroup successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while removing coach from subgroup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get available players for a subgroup (not assigned to any subgroup in the session)
export const getAvailablePlayersForSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.query.teamId || req.body.teamId;
    const { sessionId, category } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Get all players in this category for the team
    const allPlayers = await Player.find({ 
      team: teamId, 
      group: category 
    }).select('fullName dateOfBirth group');

    // Get all subgroups in this session for this category
    const subgroups = await Subgroup.find({ 
      session: sessionId, 
      team: teamId, 
      category: category 
    });

    // Get all player IDs already assigned to subgroups
    const assignedPlayerIds = subgroups.reduce((acc, subgroup) => {
      return acc.concat(subgroup.players);
    }, []);

    // Filter out already assigned players
    const availablePlayers = allPlayers.filter(
      player => !assignedPlayerIds.includes(player._id)
    );

    res.status(200).json({
      success: true,
      count: availablePlayers.length,
      data: availablePlayers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available players',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get available coaches for a subgroup
export const getAvailableCoachesForSubgroup = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id || req.body.teamId;
    const { subgroupId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    // Get all coaches for the team
    const allCoaches = await Coach.find({ team: teamId }).select('fullName email specialization');

    // Get the subgroup to see which coaches are already assigned
    const subgroup = await Subgroup.findOne({ _id: subgroupId, team: teamId });
    if (!subgroup) {
      return res.status(404).json({
        success: false,
        message: 'Subgroup not found'
      });
    }

    // Filter out already assigned coaches
    const availableCoaches = allCoaches.filter(
      coach => !subgroup.coaches.includes(coach._id)
    );

    res.status(200).json({
      success: true,
      count: availableCoaches.length,
      data: availableCoaches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available coaches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
