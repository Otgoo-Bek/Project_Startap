import app from './app';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 ASAP HORECA Backend запущен!`);
  console.log(`📍 Порт: ${PORT}`);
  console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⏰ ${new Date().toISOString()}`);
});
