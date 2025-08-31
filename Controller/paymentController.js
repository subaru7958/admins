import Payment from '../Models/Payment.js';
import Session from '../Models/Session.js';

export const markPaid = async (req, res) => {
	try {
		const { sessionId } = req.params;
		const { subjectId, subjectType, amount, year, month, notes } = req.body;
		if (!subjectId || !subjectType) {
			return res.status(400).json({ success: false, message: 'subjectId and subjectType are required' });
		}
		if (!['player', 'coach'].includes(subjectType)) {
			return res.status(400).json({ success: false, message: 'Invalid subjectType' });
		}
		const session = await Session.findById(sessionId);
		if (!session) {
			return res.status(404).json({ success: false, message: 'Session not found' });
		}
		const now = new Date();
		const resolvedYear = year || now.getFullYear();
		const resolvedMonth = month || (now.getMonth() + 1);
		const payment = await Payment.findOneAndUpdate(
			{ session: sessionId, team: session.team, subjectType, subject: subjectId, year: resolvedYear, month: resolvedMonth },
			{ $set: { amount: Number(amount || 0), status: 'paid', paidAt: new Date(), notes: notes || '' } },
			{ new: true, upsert: true, setDefaultsOnInsert: true }
		);
		return res.status(200).json({ success: true, data: payment });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export const getPaymentsForSession = async (req, res) => {
	try {
		const { sessionId } = req.params;
		const payments = await Payment.find({ session: sessionId }).sort({ year: -1, month: -1 });
		return res.status(200).json({ success: true, data: payments });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

// Generate payment schedule for a session and subject type for the full season
export const getPaymentSchedule = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { subjectType } = req.query; // 'player' | 'coach'
    if (!['player', 'coach'].includes(subjectType)) {
      return res.status(400).json({ success: false, message: 'Invalid subjectType' });
    }

    const session = await Session.findById(sessionId).populate(subjectType === 'player' ? 'players' : 'coaches');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Build month list between start and end
    const start = new Date(session.startDate);
    const end = new Date(session.endDate);
    const months = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const subjects = subjectType === 'player' ? session.players : session.coaches;

    // Fetch existing payments for all subjects for this session
    const payments = await Payment.find({ session: sessionId, subjectType });
    const key = (sId, y, m) => `${sId}-${y}-${m}`;
    const paymentMap = new Map();
    payments.forEach(p => paymentMap.set(key(String(p.subject), p.year, p.month), p));

    const isMonthPast = (y, m) => {
      // Consider a month past if the last day of that month is before today
      const lastDay = new Date(y, m, 0); // m is 1-based; JS Date month is 0-based, so month m gives last day of previous month => use (y, m, 0)
      const today = new Date();
      lastDay.setHours(23,59,59,999);
      return lastDay < today;
    };

    const schedule = subjects.map(s => {
      const subjectId = s._id || s;
      const baseAmount = subjectType === 'player' ? Number(s.monthlyFee || 0) : Number(s.agreedSalary || 0);
      const rows = months.map(({ year, month }) => {
        const p = paymentMap.get(key(String(subjectId), year, month));
        const derivedStatus = p?.status || (isMonthPast(year, month) ? 'delayed' : 'pending');
        return {
          year,
          month,
          status: derivedStatus,
          amount: (p && typeof p.amount === 'number') ? p.amount : baseAmount,
          paidAt: p?.paidAt || null,
          notes: p?.notes || '',
        };
      });
      return {
        subject: {
          _id: s._id || s,
          fullName: s.fullName || undefined,
          group: s.group || undefined,
          specialization: s.specialization || undefined,
          baseAmount,
        },
        rows,
      };
    });

    return res.status(200).json({ success: true, data: { months, schedule } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update a payment status explicitly (paid, pending, delayed, unpaid)
export const setPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { subjectId, subjectType, year, month, status, amount, notes } = req.body;
    if (!subjectId || !subjectType || !year || !month || !status) {
      return res.status(400).json({ success: false, message: 'subjectId, subjectType, year, month, status are required' });
    }
    if (!['player', 'coach'].includes(subjectType)) {
      return res.status(400).json({ success: false, message: 'Invalid subjectType' });
    }
    if (!['paid', 'pending', 'delayed', 'unpaid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const update = {
      amount: amount !== undefined ? Number(amount) : undefined,
      status,
      notes: notes || '',
      paidAt: status === 'paid' ? new Date() : null,
      team: session.team,
    };
    // Remove undefined to avoid overwriting
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

    const payment = await Payment.findOneAndUpdate(
      { session: sessionId, team: session.team, subjectType, subject: subjectId, year, month },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



