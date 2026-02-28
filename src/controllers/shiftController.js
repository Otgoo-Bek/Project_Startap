const ShiftService = require('./../services/shiftService');
const UserService = require('./../services/userService');

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
    // Ищем любого пользователя из базы (для демо)
    // В реальном приложении: использовать req.user.id из токена
    const users = await UserService.getAllUsers();
    if (users.length === 0) {
      return res.status(400).json({ 
        error: 'No users found. Please create a user first via POST /users/sync' 
      });
    }
    
    // Берём первого пользователя как создателя смены
    const creatorId = users[0].id;
    
    const shift = await ShiftService.createShift(req.body, creatorId);
    res.status(201).json(shift);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getAllShifts, createShift };