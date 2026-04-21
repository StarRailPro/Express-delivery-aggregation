import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import packageRouter from './routes/package';
import geocodingRouter from './routes/geocoding';
import notificationRouter from './routes/notification';
import adminRouter from './routes/admin';
import { startScheduler } from './services/scheduler';

const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/packages', packageRouter);
app.use('/api/geocoding', geocodingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/express-delivery';

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] 连接成功: ${MONGODB_URI}`);
    startScheduler();
  } catch (error) {
    console.error('[MongoDB] 连接失败:', error);
    console.error('[MongoDB] 请确保 MongoDB 服务已启动，或检查 MONGODB_URI 配置');
  }
}

function startServer(): void {
  app.listen(PORT, () => {
    console.log(`[Server] 服务启动成功，端口: ${PORT}`);
    console.log(`[Server] 健康检查: http://localhost:${PORT}/api/health`);
  });

  connectDatabase();
}

startServer();

export default app;
