import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectToDatabase } from './config/database.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { ticketsRouter } from './routes/tickets.js';
import { eventsRouter } from './routes/events.js';
import { benefitsRouter } from './routes/benefits.js';
import { pointsRouter } from './routes/points.js';

const PORT = Number(process.env.PORT ?? 4000);
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);

async function bootstrap(): Promise<void> {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('[bootstrap] Error al conectar con MongoDB:', error);
    process.exit(1);
  }

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors(
      allowedOrigins === undefined || allowedOrigins.length === 0
        ? {}
        : {
            origin: allowedOrigins,
            credentials: true,
          }
    )
  );
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    });
  });

  app.use('/api/tickets', ticketsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/benefits', benefitsRouter);
  app.use('/api/points', pointsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: 'Recurso no encontrado.' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = error.status ?? 500;
    const message =
      statusCode === 500
        ? 'Ocurrió un error inesperado. Intenta nuevamente más tarde.'
        : error.message;

    if (statusCode === 500) {
      console.error('[api] Error no controlado:', error);
    }

    res.status(statusCode).json({ message });
  });

  app.listen(PORT, () => {
    console.info(`[bootstrap] Servidor escuchando en http://localhost:${PORT}`);
  });
}

void bootstrap();

