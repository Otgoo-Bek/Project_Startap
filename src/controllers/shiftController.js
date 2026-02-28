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
    // Временное решение для демо: используем первого пользователя из базы
    // В реальном приложении: req.user.id из аутентификации
    const creator = await prisma.user.findFirst({
      where: { role: 'B2B' } // Ищем работодателя
    }) || await prisma.user.findFirst(); // Или любого пользователя
    
    if (!creator) {
      return res.status(400).json({ 
        error: 'No users found. Please create a user first via POST /users/sync' 
      });
    }
    
    const shift = await ShiftService.createShift(req.body, creator.id);
    res.status(201).json(shift);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
module.exports = { getAllShifts, createShift };