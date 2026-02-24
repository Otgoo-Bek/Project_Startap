const express = require('express');
const app = express();

// ТОЛЬКО два рабочих эндпоинта
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/', (req, res) => {
  res.json({ message: 'API is working' });
});

// 404 handler через app.use (а не app.get)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => {
  console.log('Server running on 3000');
});
