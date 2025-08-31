import Event from '../Models/Event.js';

// Get all events for a team
export const getEvents = async (req, res) => {
  try {
    const { startDate, endDate, team } = req.query;
    let query = {};
    
    // If team is provided, filter by team
    if (team) {
      query.team = team;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        query.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startDate.$lte = new Date(endDate);
      }
    }

    const events = await Event.find(query)
      .select('-__v')
      .sort({ startDate: 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('-__v');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    const { title, description, eventType, startDate, endDate, location, notes, team } = req.body;
    
    // Validate that endDate is after startDate
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const event = await Event.create({
      title,
      description: description || '',
      eventType,
      startDate,
      endDate,
      location: location || '',
      notes: notes || '',
      team
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
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
      message: 'Server error while creating event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const { title, description, eventType, startDate, endDate, location, notes, team } = req.body;
    
    // Validate that endDate is after startDate
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description: description || '',
        eventType,
        startDate,
        endDate,
        location: location || '',
        notes: notes || '',
        team
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
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
      message: 'Server error while updating event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};