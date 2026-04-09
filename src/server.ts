import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Обязательно для Render!

app.listen(PORT, HOST, () => {
  console.log(`🚀 ASAP HORECA Backend запущен!`);
  console.log(`📍 Порт: ${PORT}`);
  console.log(`🌍 Хост: ${HOST}`);
  console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/health`);
  console.log(`⏰ ${new Date().toISOString()}`);
});