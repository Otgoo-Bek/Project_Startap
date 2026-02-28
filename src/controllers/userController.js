const UserService = require('./../services/userService');

const syncUser = async (req, res) => {
  try {
    const user = await UserService.syncUser(req.body);
    res.status(200).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { syncUser };