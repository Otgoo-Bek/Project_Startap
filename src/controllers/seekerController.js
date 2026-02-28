const UserService = require('./../services/userService');

const toggleHotStatus = async (req, res) => {
  try {
    // В реальном проекте: req.user.id из токена
    const userId = '8768f69d-aea9-4239-8212-82ed7fd39511'; // ID Ольги
    
    const user = await UserService.toggleHotStatus(userId, req.body.isHot);
    res.status(200).json({ isHot: user.isHot });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { toggleHotStatus };