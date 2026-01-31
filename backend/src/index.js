import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import apiRoutes from './routes/api.js';
import { startWorker } from './queue/worker.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
async function start() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Sync models
    await sequelize.sync();
    console.log('✅ Models synced');
    
    // Start BullMQ worker
    startWorker();
    console.log('✅ Worker started');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();
