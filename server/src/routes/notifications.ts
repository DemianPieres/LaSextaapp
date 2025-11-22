import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireUserAuth, type UserRequest } from '../middleware/auth.js';

type NotificationDocument = {
  _id: ObjectId;
  usuarioId: ObjectId;
  tipo: 'evento' | 'ticket' | 'puntos';
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaCreacion: Date;
  metadata?: {
    eventoId?: string;
    ticketId?: string;
    puntos?: number;
  };
};

const notificationsRouter = Router();

function sanitizeNotification(notification: NotificationDocument) {
  return {
    id: notification._id.toHexString(),
    tipo: notification.tipo,
    titulo: notification.titulo,
    mensaje: notification.mensaje,
    leida: notification.leida,
    fechaCreacion: notification.fechaCreacion,
    metadata: notification.metadata ?? {},
  };
}

// Crear notificación (usado internamente por otros endpoints)
export async function createNotification(
  usuarioId: ObjectId,
  tipo: 'evento' | 'ticket' | 'puntos',
  titulo: string,
  mensaje: string,
  metadata?: { eventoId?: string; ticketId?: string; puntos?: number }
): Promise<void> {
  const db = await connectToDatabase();
  const notification: NotificationDocument = {
    _id: new ObjectId(),
    usuarioId,
    tipo,
    titulo,
    mensaje,
    leida: false,
    fechaCreacion: new Date(),
    metadata,
  };
  await db.collection<NotificationDocument>('Notificaciones').insertOne(notification);
}

// Obtener notificaciones del usuario autenticado
notificationsRouter.get(
  '/me',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user === undefined) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const db = await connectToDatabase();
      const notifications = await db
        .collection<NotificationDocument>('Notificaciones')
        .find({ usuarioId: new ObjectId(req.user.userId) })
        .sort({ fechaCreacion: -1 })
        .limit(50)
        .toArray();

      res.json({ notifications: notifications.map(sanitizeNotification) });
    } catch (error) {
      next(error);
    }
  }
);

// Obtener cantidad de notificaciones no leídas
notificationsRouter.get(
  '/me/unread-count',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user === undefined) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const db = await connectToDatabase();
      const count = await db
        .collection<NotificationDocument>('Notificaciones')
        .countDocuments({ usuarioId: new ObjectId(req.user.userId), leida: false });

      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
);

// Marcar notificaciones como leídas
notificationsRouter.patch(
  '/me/mark-read',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user === undefined) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const { notificationIds } = req.body ?? {};
      
      const db = await connectToDatabase();
      const userId = new ObjectId(req.user.userId);

      if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Marcar notificaciones específicas como leídas
        const objectIds = notificationIds
          .filter((id: unknown) => typeof id === 'string' && ObjectId.isValid(id))
          .map((id: string) => new ObjectId(id));

        if (objectIds.length > 0) {
          await db.collection<NotificationDocument>('Notificaciones').updateMany(
            { _id: { $in: objectIds }, usuarioId: userId },
            { $set: { leida: true } }
          );
        }
      } else {
        // Marcar todas las notificaciones del usuario como leídas
        await db.collection<NotificationDocument>('Notificaciones').updateMany(
          { usuarioId: userId, leida: false },
          { $set: { leida: true } }
        );
      }

      res.json({ message: 'Notificaciones marcadas como leídas.' });
    } catch (error) {
      next(error);
    }
  }
);

export { notificationsRouter };

