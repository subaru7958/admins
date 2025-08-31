import Attendance from '../Models/Attendance.js';
import TrainingSession from '../Models/TrainingSession.js';
import Player from '../Models/Player.js';
import Subgroup from '../Models/Subgroup.js';

// Helper function for consistent API responses
const apiResponse = (res, statusCode, success, message, data = null, errors = null) => {
  const response = { success, message };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Get attendance for a training session
export const getAttendanceForSession = async (req, res) => {
  try {
    const { trainingSessionId } = req.params;
    const { coachId } = req.query; // Get coach ID from query to filter subgroups

    // Get training session with basic info
    const trainingSession = await TrainingSession.findById(trainingSessionId)
      .populate('session', 'name');

    if (!trainingSession) {
      return apiResponse(res, 404, false, 'Training session not found');
    }

    // Get team ID from the training session
    const teamId = trainingSession.team;
    if (!teamId) {
      return apiResponse(res, 400, false, 'Training session has no associated team');
    }

    // Get all subgroups for this session and group (and specific subgroup if session targets one)
    const subgroupQuery = {
      session: trainingSession.session._id,
      category: trainingSession.group,
      team: teamId
    };
    if (trainingSession.subgroup) {
      subgroupQuery._id = trainingSession.subgroup;
    }
    const subgroups = await Subgroup.find(subgroupQuery)
      .populate('players', 'fullName group photo')
      .populate('coaches', 'fullName');

    // Filter subgroups based on coach assignment
    let relevantSubgroups = subgroups;
    if (coachId) {
      const coachIdStr = coachId.toString();
      relevantSubgroups = subgroups.filter(subgroup => 
        (subgroup.coaches || []).some(coach => {
          const cId = typeof coach === 'string' ? coach : coach._id?.toString();
          return cId === coachIdStr;
        })
      );
    }

    // Get all players from relevant subgroups
    const allPlayers = [];
    const playerMap = new Map(); // To avoid duplicates

    relevantSubgroups.forEach(subgroup => {
      subgroup.players.forEach(player => {
        if (!playerMap.has(player._id.toString())) {
          playerMap.set(player._id.toString(), player);
          allPlayers.push(player);
        }
      });
    });

    // If no subgroups or no coach filtering, fall back to directly assigned players
    if (allPlayers.length === 0) {
      // Fallback: get directly assigned players (for backward compatibility)
      const trainingSessionWithPlayers = await TrainingSession.findById(trainingSessionId)
        .populate('players', 'fullName group photo');
      
      if (trainingSessionWithPlayers.players) {
        allPlayers.push(...trainingSessionWithPlayers.players);
      }
    }

    // Get existing attendance records
    const attendanceRecords = await Attendance.find({ trainingSession: trainingSessionId })
      .populate('player', 'fullName group photo')
      .populate('markedBy', 'fullName');

    // Create attendance data for all players
    const attendanceData = allPlayers.map(player => {
      const existingRecord = attendanceRecords.find(record => 
        record.player._id.toString() === player._id.toString()
      );
      
      return {
        player: {
          _id: player._id,
          fullName: player.fullName,
          group: player.group,
          photo: player.photo
        },
        status: existingRecord ? existingRecord.status : 'not_marked',
        notes: existingRecord ? existingRecord.notes : '',
        markedBy: existingRecord ? existingRecord.markedBy : null,
        markedAt: existingRecord ? existingRecord.markedAt : null
      };
    });

    return apiResponse(res, 200, true, 'Attendance data retrieved successfully', {
      trainingSession: {
        _id: trainingSession._id,
        title: trainingSession.title,
        group: trainingSession.group,
        dayOfWeek: trainingSession.dayOfWeek,
        startTime: trainingSession.startTime,
        endTime: trainingSession.endTime
      },
      attendance: attendanceData,
      subgroups: relevantSubgroups.map(sg => ({
        _id: sg._id,
        name: sg.name,
        category: sg.category,
        playerCount: sg.players.length
      }))
    });

  } catch (error) {
    console.error('Get attendance error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching attendance data');
  }
};

// Mark attendance for a player
export const markAttendance = async (req, res) => {
  try {
    const { trainingSessionId, playerId } = req.params;
    const { status, notes, coachId } = req.body; // Get coach ID from body

    if (!['present', 'absent', 'late'].includes(status)) {
      return apiResponse(res, 400, false, 'Invalid attendance status');
    }

    // Verify training session exists
    const trainingSession = await TrainingSession.findById(trainingSessionId);

    if (!trainingSession) {
      return apiResponse(res, 404, false, 'Training session not found');
    }

    // Get team ID from the training session
    const teamId = trainingSession.team;
    if (!teamId) {
      return apiResponse(res, 400, false, 'Training session has no associated team');
    }

    // If coach ID is provided, verify the player is in a subgroup the coach is responsible for
    if (coachId) {
      const subgroups = await Subgroup.find({
        session: trainingSession.session,
        category: trainingSession.group,
        team: teamId
      });

      const coachIdStr = coachId.toString();
      const playerIdStr = playerId.toString();
      const isPlayerInCoachSubgroup = subgroups.some(subgroup => {
        const coachMatch = (subgroup.coaches || []).some(c => (typeof c === 'string' ? c : c.toString()) === coachIdStr || (c?._id?.toString && c._id.toString()) === coachIdStr);
        const playerMatch = (subgroup.players || []).some(p => (typeof p === 'string' ? p : p.toString()) === playerIdStr || (p?._id?.toString && p._id.toString()) === playerIdStr);
        return coachMatch && playerMatch;
      });

      if (!isPlayerInCoachSubgroup) {
        return apiResponse(res, 403, false, 'Player is not in a subgroup you are responsible for');
      }
    } else {
      // Fallback: verify player is directly assigned to this session (for backward compatibility)
      const isPlayerAssigned = trainingSession.players.includes(playerId);
      if (!isPlayerAssigned) {
        return apiResponse(res, 403, false, 'Player is not assigned to this training session');
      }
    }

    // Update or create attendance record
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { trainingSession: trainingSessionId, player: playerId },
      {
        status,
        notes: notes || '',
        markedAt: new Date(),
        markedBy: coachId || null
      },
      { upsert: true, new: true }
    ).populate('player', 'fullName group');

    return apiResponse(res, 200, true, 'Attendance marked successfully', {
      attendance: attendanceRecord
    });

  } catch (error) {
    console.error('Mark attendance error:', error.message);
    return apiResponse(res, 500, false, 'Error marking attendance');
  }
};

// Mark attendance for multiple players
export const markBulkAttendance = async (req, res) => {
  try {
    const { trainingSessionId } = req.params;
    const { attendanceData, coachId } = req.body; // Array of { playerId, status, notes } + coachId

    if (!Array.isArray(attendanceData)) {
      return apiResponse(res, 400, false, 'Attendance data must be an array');
    }

    // Verify training session exists
    const trainingSession = await TrainingSession.findById(trainingSessionId);

    if (!trainingSession) {
      return apiResponse(res, 404, false, 'Training session not found');
    }

    // Get team ID from the training session
    const teamId = trainingSession.team;
    if (!teamId) {
      return apiResponse(res, 400, false, 'Training session has no associated team');
    }

    const results = [];
    const errors = [];

    for (const item of attendanceData) {
      try {
        const { playerId, status, notes } = item;

        if (!['present', 'absent', 'late'].includes(status)) {
          errors.push(`Invalid status for player ${playerId}`);
          continue;
        }

        // If coach ID is provided, verify the player is in a subgroup the coach is responsible for
        let isPlayerAuthorized = false;
        if (coachId) {
          const subgroups = await Subgroup.find({
            session: trainingSession.session,
            category: trainingSession.group,
            team: teamId
          });

          const coachIdStr = coachId.toString();
          const playerIdStr = playerId.toString();
          isPlayerAuthorized = subgroups.some(subgroup => {
            const coachMatch = (subgroup.coaches || []).some(c => (typeof c === 'string' ? c : c.toString()) === coachIdStr || (c?._id?.toString && c._id.toString()) === coachIdStr);
            const playerMatch = (subgroup.players || []).some(p => (typeof p === 'string' ? p : p.toString()) === playerIdStr || (p?._id?.toString && p._id.toString()) === playerIdStr);
            return coachMatch && playerMatch;
          });
        } else {
          // Fallback: verify player is directly assigned to this session (for backward compatibility)
          isPlayerAuthorized = trainingSession.players.includes(playerId);
        }

        if (!isPlayerAuthorized) {
          errors.push(`Player ${playerId} is not authorized for this coach`);
          continue;
        }

        // Update or create attendance record
        const attendanceRecord = await Attendance.findOneAndUpdate(
          { trainingSession: trainingSessionId, player: playerId },
          {
            status,
            notes: notes || '',
            markedAt: new Date(),
            markedBy: coachId || null
          },
          { upsert: true, new: true }
        );

        results.push(attendanceRecord);
      } catch (error) {
        errors.push(`Error marking attendance for player ${item.playerId}: ${error.message}`);
      }
    }

    return apiResponse(res, 200, true, 'Bulk attendance marked successfully', {
      results,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('Bulk mark attendance error:', error.message);
    return apiResponse(res, 500, false, 'Error marking bulk attendance');
  }
};

// Get attendance statistics for a training session
export const getAttendanceStats = async (req, res) => {
  try {
    const { trainingSessionId } = req.params;

    // Verify training session exists
    const trainingSession = await TrainingSession.findById(trainingSessionId);

    if (!trainingSession) {
      return apiResponse(res, 404, false, 'Training session not found');
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find({ trainingSession: trainingSessionId });

    // Calculate statistics
    const totalPlayers = trainingSession.players.length;
    const presentCount = attendanceRecords.filter(record => record.status === 'present').length;
    const absentCount = attendanceRecords.filter(record => record.status === 'absent').length;
    const lateCount = attendanceRecords.filter(record => record.status === 'late').length;
    const notMarkedCount = totalPlayers - (presentCount + absentCount + lateCount);

    const stats = {
      total: totalPlayers,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      notMarked: notMarkedCount,
      attendanceRate: totalPlayers > 0 ? ((presentCount + lateCount) / totalPlayers * 100).toFixed(1) : 0
    };

    return apiResponse(res, 200, true, 'Attendance statistics retrieved successfully', {
      trainingSession: {
        _id: trainingSession._id,
        title: trainingSession.title,
        date: trainingSession.date
      },
      stats
    });

  } catch (error) {
    console.error('Get attendance stats error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching attendance statistics');
  }
};
