const http = require('http');

console.log('Starting raw HTTP server...');

const server = http.createServer((req, res) => {
  console.log(`RAW SERVER: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  const response = { 
    message: 'Raw server response',
    timestamp: new Date().toISOString(),
    url: req.url
  };
  
  console.log('Sending response:', response);
  res.end(JSON.stringify(response));
});

server.on('error', (err) => {
  console.error('Server error event:', err);
});

server.on('connection', (socket) => {
  console.log('New connection from:', socket.remoteAddress);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Raw HTTP server listening on 0.0.0.0:3000');
  console.log('Test with: curl http://localhost:3000/anything');
});
