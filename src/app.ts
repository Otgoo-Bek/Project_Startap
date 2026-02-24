import express from 'express';
import cors from 'cors';
import userRoutes from './routes/user.routes';

const app = express();

// Логгирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'ASAP HORECA Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ASAP HORECA API',
    description: 'Emergency staff marketplace for restaurants and cafes',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      users: {
        sync: 'POST /users/sync',
        profile: 'GET /users/me',
        update: 'PATCH /users/me',
        push_token: 'PATCH /users/push-token',
        seeker_status: 'PATCH /users/seeker/status (B2C only)'
      }
    }
  });
});

// API Routes
app.use('/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default app;
