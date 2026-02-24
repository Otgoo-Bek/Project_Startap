const http = require('http');

console.log('Starting fresh HTTP server...');

const server = http.createServer((req, res) => {
  console.log(`✅ REQUEST: ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  
  // Всегда отвечаем быстро
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  const response = {
    status: 'OK',
    message: 'ASAP HORECA API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  };
  
  console.log('📤 Sending response:', response);
  res.end(JSON.stringify(response, null, 2));
});

// Слушаем на всех интерфейсах
server.listen(3000, '0.0.0.0', () => {
  const address = server.address();
  console.log(`🚀 Server STARTED successfully!`);
  console.log(`📍 Address: ${address.address}:${address.port}`);
  console.log(`🔗 Local: http://localhost:${address.port}`);
  console.log(`🔗 Local IPv4: http://127.0.0.1:${address.port}`);
  console.log(`🔗 Test: curl -v http://localhost:${address.port}/health`);
});

// Обработчики ошибок
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.log('⚠️  Port 3000 busy, trying 3001...');
    server.listen(3001, '0.0.0.0');
  }
});

server.on('connection', (socket) => {
  console.log(`🔌 New connection from: ${socket.remoteAddress}:${socket.remotePort}`);
});

console.log('Server script loaded');
