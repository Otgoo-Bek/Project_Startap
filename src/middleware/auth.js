// Заглушка для теста — пока не подключаешь Firebase
const authenticate = (req, res, next) => {
  // В продакшене: проверка Firebase токена
  req.user = { uid: 'test-user-1', role: 'B2C' };
  next();
};

module.exports = { authenticate };