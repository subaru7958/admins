import Session from '../Models/Session.js';
import Player from '../Models/Player.js';
import Coach from '../Models/Coach.js';

// Create a new session
export const createSession = async (req, res) => {
  try {

    const { name, description, startDate, endDate, type, team } = req.body;
    
    const session = new Session({
      name,
      description,
      startDate,
      endDate,
      type,
      team
    });
    
    await session.save();
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all sessions for a team
export const getSessions = async (req, res) => {
  try {

    const { teamId } = req.query;
    const sessions = await Session.find({ team: teamId })
      .populate('players')
      .populate('coaches')
      .sort({ startDate: -1 });
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a specific session with populated players and coaches
export const getSessionById = async (req, res) => {
  try {

    const { id } = req.params;
    const session = await Session.findById(id)
      .populate('players')
      .populate('coaches');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a session
export const updateSession = async (req, res) => {
  try {

    const { id } = req.params;
    const updates = req.body;
    
    const session = await Session.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a session
export const deleteSession = async (req, res) => {
  try {

    const { id } = req.params;
    
    const session = await Session.findByIdAndDelete(id);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a player to a session
export const addPlayerToSession = async (req, res) => {
  try {

    const { sessionId, playerId } = req.params;
    
    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    
    // Add player to session
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $addToSet: { players: playerId } },
      { new: true }
    ).populate('players').populate('coaches');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Also update player's session reference
    await Player.findByIdAndUpdate(playerId, { session: sessionId });
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a player from a session
export const removePlayerFromSession = async (req, res) => {
  try {

    const { sessionId, playerId } = req.params;
    
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $pull: { players: playerId } },
      { new: true }
    ).populate('players').populate('coaches');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Also remove player's session reference
    await Player.findByIdAndUpdate(playerId, { session: null });
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a coach to a session
export const addCoachToSession = async (req, res) => {
  try {

    const { sessionId, coachId } = req.params;
    
    // Verify coach exists
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({ success: false, message: 'Coach not found' });
    }
    
    // Add coach to session
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $addToSet: { coaches: coachId } },
      { new: true }
    ).populate('players').populate('coaches');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Also update coach's session reference
    await Coach.findByIdAndUpdate(coachId, { session: sessionId });
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a coach from a session
export const removeCoachFromSession = async (req, res) => {
  try {

    const { sessionId, coachId } = req.params;
    
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $pull: { coaches: coachId } },
      { new: true }
    ).populate('players').populate('coaches');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Also remove coach's session reference
    await Coach.findByIdAndUpdate(coachId, { session: null });
    
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};