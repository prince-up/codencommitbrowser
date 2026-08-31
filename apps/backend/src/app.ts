import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth.routes';
import examRoutes from './routes/exam.routes';
import codeRoutes from './routes/code.routes';
import recordingRoutes from './routes/recording.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true, // required for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Security: Apply Global API Rate Limiting (Phase 12)
const { apiLimiter } = require('./middleware/rateLimit.middleware');
app.use('/api', apiLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', examRoutes);
app.use('/api', codeRoutes);
app.use('/api', recordingRoutes); // Upload/S3 URLs

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
