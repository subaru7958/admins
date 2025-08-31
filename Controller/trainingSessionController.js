import TrainingSession from '../Models/TrainingSession.js';

// Create a new training session
export const createTrainingSession = async (req, res) => {
  try {

    const { title, description, startTime, endTime } = req.body;

    // Derive/validate dayOfWeek
    let resolvedDayOfWeek = req.body.dayOfWeek;
    if (!resolvedDayOfWeek && req.body.date) {
      const d = new Date(req.body.date);
      resolvedDayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Normalize session id
    const rawSession = req.body.session;
    const resolvedSessionId = (rawSession && typeof rawSession === 'object')
      ? (rawSession._id || rawSession.id)
      : rawSession;

    if (!resolvedSessionId) {
      return res.status(400).json({ success: false, message: 'Session is required' });
    }
    if (!resolvedDayOfWeek) {
      return res.status(400).json({ success: false, message: 'Day of week is required' });
    }

    // Get team ID from session
    const Session = (await import('../Models/Session.js')).default;
    const sessionDoc = await Session.findById(resolvedSessionId);
    if (!sessionDoc) {
      return res.status(400).json({ success: false, message: 'Session not found' });
    }

    // Normalize players array (coaches are now handled via subgroups)
    const normalizeIds = (arr) => Array.isArray(arr) ? arr.map(x => (typeof x === 'object' && x !== null) ? (x._id || x.id) : x) : [];
    const resolvedPlayers = normalizeIds(req.body.players);

    const trainingSession = new TrainingSession({
      title,
      description,
      startTime,
      endTime,
      dayOfWeek: resolvedDayOfWeek,
      location: req.body.location,
      group: req.body.group,
      subgroup: req.body.subgroup || null,
      session: resolvedSessionId,
      team: sessionDoc.team,
      players: resolvedPlayers,
      isWeekly: req.body.isWeekly || false,
      notes: req.body.notes || '',
    });
    
    await trainingSession.save();
    res.status(201).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all training sessions for a session
export const getTrainingSessions = async (req, res) => {
  try {

    const { sessionId } = req.params;
    const { group, subgroup } = req.query;

    const query = { session: sessionId };
    if (group) query.group = group;
    if (subgroup) query.subgroup = subgroup;

    const trainingSessions = await TrainingSession.find(query)
      .populate('players')
      .populate('session');
    res.status(200).json({ success: true, data: trainingSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a specific training session
export const getTrainingSessionById = async (req, res) => {
  try {

    const { id } = req.params;
    const trainingSession = await TrainingSession.findById(id)
      .populate('players')
      .populate('session');
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a training session
export const updateTrainingSession = async (req, res) => {
  try {

    const { id } = req.params;
    const updates = { ...req.body };

    // Coerce session if provided as object
    if (updates.session && typeof updates.session === 'object') {
      updates.session = updates.session._id || updates.session.id;
    }

    // Normalize players array
    const normalizeIds = (arr) => Array.isArray(arr) ? arr.map(x => (typeof x === 'object' && x !== null) ? (x._id || x.id) : x) : [];
    if (updates.players) updates.players = normalizeIds(updates.players);

    const trainingSession = await TrainingSession.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('players')
      .populate('session');
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a training session
export const deleteTrainingSession = async (req, res) => {
  try {

    const { id } = req.params;
    const trainingSession = await TrainingSession.findByIdAndDelete(id);
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, message: 'Training session deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a player to a training session
export const addPlayerToTrainingSession = async (req, res) => {
  try {

    const { sessionId, playerId } = req.params;
    
    const trainingSession = await TrainingSession.findByIdAndUpdate(
      sessionId,
      { $addToSet: { players: playerId } },
      { new: true, runValidators: true }
    )
      .populate('players')
      .populate('session');
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a player from a training session
export const removePlayerFromTrainingSession = async (req, res) => {
  try {

    const { sessionId, playerId } = req.params;
    
    const trainingSession = await TrainingSession.findByIdAndUpdate(
      sessionId,
      { $pull: { players: playerId } },
      { new: true, runValidators: true }
    )
      .populate('players')
      .populate('session');
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update attendance for a training session
export const updateAttendance = async (req, res) => {
  try {

    const { sessionId } = req.params;
    const { playerId, status } = req.body;
    
    // Find the training session
    const trainingSession = await TrainingSession.findById(sessionId);
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    // Check if player is in the session
    if (!trainingSession.players.includes(playerId)) {
      return res.status(400).json({ success: false, message: 'Player is not registered for this training session' });
    }
    
    // Update attendance
    const attendanceIndex = trainingSession.attendance.findIndex(a => a.player.toString() === playerId);
    
    if (attendanceIndex >= 0) {
      // Update existing attendance
      trainingSession.attendance[attendanceIndex].status = status;
      trainingSession.attendance[attendanceIndex].timestamp = new Date();
    } else {
      // Add new attendance record
      trainingSession.attendance.push({
        player: playerId,
        status,
        timestamp: new Date()
      });
    }
    
    await trainingSession.save();
    
    res.status(200).json({ success: true, data: trainingSession });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance for a training session
export const getAttendance = async (req, res) => {
  try {

    const { sessionId } = req.params;
    
    const trainingSession = await TrainingSession.findById(sessionId)
      .populate('attendance.player');
    
    if (!trainingSession) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }
    
    res.status(200).json({ success: true, data: trainingSession.attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};