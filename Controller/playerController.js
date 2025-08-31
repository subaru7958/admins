import Player from '../Models/Player.js';
import Team from '../Models/Team.js';
import Payment from '../Models/Payment.js';
import Session from '../Models/Session.js';
import mongoose from 'mongoose';

// Helper: compute monthly billing status
const buildMonthlyBilling = (player) => {
  try {
    const monthlyFee = Number(player.monthlyFee || 0);
    if (!monthlyFee || monthlyFee <= 0) {
      return { status: 'na', label: 'No monthly fee', dueMonth: null, daysOverdue: 0 };
    }

    const now = new Date();
    const createdAt = new Date(player.createdAt || now);
    const trialEnd = new Date(createdAt);
    trialEnd.setMonth(trialEnd.getMonth() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Free until one month after registration
    if (now < trialEnd) {
      return { status: 'not_due', label: 'Not due yet (first month)', dueMonth: null, daysOverdue: 0 };
    }

    const lastPaymentDate = player.lastPaymentDate ? new Date(player.lastPaymentDate) : null;
    if (lastPaymentDate && lastPaymentDate >= monthStart) {
      return { status: 'paid', label: 'Paid this month', dueMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, daysOverdue: 0 };
    }

    const msSinceStart = now.getTime() - monthStart.getTime();
    const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));
    const status = daysSinceStart <= 10 ? 'pending' : 'overdue';
    const label = status === 'pending' ? 'Pending this month' : 'Overdue this month';
    return { status, label, dueMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, daysOverdue: Math.max(0, daysSinceStart - 10) };
  } catch (error) {
    console.error('Error in buildMonthlyBilling:', error);
    return { status: 'error', label: 'Error calculating billing', dueMonth: null, daysOverdue: 0 };
  }
};

// Get all players for a team
export const getPlayers = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?._id || req.user?.id;
    
    // Convert to ObjectId if it's a string
    const objectIdTeamId = typeof teamId === 'string' ? new mongoose.Types.ObjectId(teamId) : teamId;
    
    console.log('Player fetch - req.user:', req.user);
    console.log('Player fetch - req.userRole:', req.userRole);
    console.log('Player fetch - teamId:', teamId);
    console.log('Player fetch - req.headers:', req.headers);
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const filter = { team: objectIdTeamId };
    
    console.log('Searching for players with filter:', filter);
    console.log('TeamId type:', typeof teamId);
    console.log('TeamId value:', teamId);
    console.log('ObjectId teamId:', objectIdTeamId);
    
    const players = await Player.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 });

    console.log('Found players:', players.length);
    console.log('Raw players data:', players);

    const data = players.map(p => {
      try {
        const obj = p.toObject();
        obj.billing = buildMonthlyBilling(p);
        return obj;
      } catch (error) {
        console.error('Error processing player:', p._id, error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Player fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching players',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get player by ID
export const getPlayerById = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const player = await Player.findOne({
      _id: req.params.id,
      team: teamId
    }).select('-__v');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    const obj = player.toObject();
    obj.billing = buildMonthlyBilling(player);
    res.status(200).json({
      success: true,
      data: obj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new player
export const createPlayer = async (req, res) => {
  try {
    // Get team from authenticated user or request body for public registration
    const teamIdFromAuth = req.user?.id || req.user?._id;
    const teamIdFromBody = req.body.team || req.query.team;
    const teamId = teamIdFromAuth || teamIdFromBody;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team is required'
      });
    }
    
    const { fullName, dateOfBirth, group, subgroup, positions, jerseyNumber, contactNumber, heightCm, weightKg, stroke, preferredDistanceM, monthlyFee, inscriptionFee, email, phone } = req.body;
    
    const photoPath = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    const player = await Player.create({
      fullName,
      dateOfBirth,
      group,
      subgroup: subgroup || null,
      positions: Array.isArray(positions) ? positions : [],
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
      contactNumber: contactNumber || '',
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      stroke: stroke || undefined,
      preferredDistanceM: preferredDistanceM ? Number(preferredDistanceM) : undefined,
      phone: phone || '',
      monthlyFee: monthlyFee ? Number(monthlyFee) : 0,
      inscriptionFee: inscriptionFee ? Number(inscriptionFee) : 0,
      photo: photoPath || '',
      email: email || '',
      phone: phone || '',
      team: teamId
    });
    
    // Try to mark inscription + first month as paid
    let paymentRecord = null;
    let activeSession = null;
    try {
      const now = new Date();
      const sessionIdFromReq = req.body.session || req.query.session;
      if (sessionIdFromReq) {
        activeSession = await Session.findOne({ _id: sessionIdFromReq, team: teamId });
      } else {
        // Find an active session for this team
        activeSession = await Session.findOne({
          team: teamId,
          startDate: { $lte: now },
          endDate: { $gte: now }
        }).sort({ startDate: -1 });
      }

      if (activeSession) {
        // Attach player to session if not already
        await Session.updateOne(
          { _id: activeSession._id },
          { $addToSet: { players: player._id } }
        );
        await Player.updateOne({ _id: player._id }, { session: activeSession._id });

        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const baseAmount = Number(player.monthlyFee || 0);
        const inscAmount = Number(player.inscriptionFee || 0);
        paymentRecord = await Payment.findOneAndUpdate(
          {
            session: activeSession._id,
            team: activeSession.team,
            subjectType: 'player',
            subject: player._id,
            year,
            month,
          },
          {
            $set: {
              amount: baseAmount,
              inscriptionIncluded: inscAmount > 0,
              inscriptionAmount: inscAmount > 0 ? inscAmount : 0,
              status: 'paid',
              paidAt: now,
              notes: 'Registration: inscription + first month',
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Update player's payment markers
        await Player.updateOne(
          { _id: player._id },
          { $set: { lastPaymentDate: now, inscriptionPaidAt: inscAmount > 0 ? now : null } }
        );
        // Reflect local instance
        player.lastPaymentDate = now;
        player.inscriptionPaidAt = inscAmount > 0 ? now : null;
      }
    } catch (paymentError) {
      console.error('Error creating initial payment for player:', paymentError);
      // Continue; do not fail player creation due to payment step
    }

    const obj = player.toObject();
    obj.billing = buildMonthlyBilling(player);
    if (paymentRecord) {
      obj.initialPayment = paymentRecord;
    }
    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: obj
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
      message: 'Server error while creating player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update player
export const updatePlayer = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { fullName, dateOfBirth, group, subgroup, positions, jerseyNumber, contactNumber, heightCm, weightKg, stroke, preferredDistanceM, monthlyFee, email, phone } = req.body;
    
    const updates = {
      fullName,
      dateOfBirth,
      group,
      subgroup: subgroup || null,
      positions: Array.isArray(positions) ? positions : [],
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
      contactNumber: contactNumber || '',
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      stroke: stroke || undefined,
      preferredDistanceM: preferredDistanceM ? Number(preferredDistanceM) : undefined,
      monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : undefined,
      phone: phone !== undefined ? phone : undefined,
      email: email !== undefined ? email : undefined,
    };
    
    const player = await Player.findOneAndUpdate(
      { _id: req.params.id, team: teamId },
      updates,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    const obj = player.toObject();
    obj.billing = buildMonthlyBilling(player);
    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: obj
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
      message: 'Server error while updating player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete player
export const deletePlayer = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const player = await Player.findOneAndDelete({
      _id: req.params.id,
      team: teamId
    });
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark player's current month as paid
export const markPlayerMonthPaid = async (req, res) => {
  try {
    const teamId = req.user?.id || req.user?._id;
    if (!teamId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const player = await Player.findOneAndUpdate(
      { _id: req.params.id, team: teamId },
      { lastPaymentDate: new Date() },
      { new: true }
    ).select('-__v');

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const obj = player.toObject();
    obj.billing = buildMonthlyBilling(player);
    res.status(200).json({ success: true, message: 'Payment recorded', data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while recording payment' });
  }
};