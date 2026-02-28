const ShiftService = require('./../services/shiftService');
const NotificationService = require('./../services/notificationService');
const getAllShifts = async (req, res) => {
  try {
    const shifts = await ShiftService.getAllShifts();
    res.status(200).json(shifts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createShift = async (req, res) => {
  try {
    const creatorId = '8768f69d-aea9-4239-8212-82ed7fd39511'; // ID Ольги
    
    const shift = await ShiftService.createShift(req.body, creatorId);
    
    await NotificationService.sendPushToHotUsers(shift);
    
    res.status(201).json(shift);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
module.exports = { getAllShifts, createShift };