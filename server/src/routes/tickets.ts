import { Router, type Request, type Response, type NextFunction } from 'express';
import type { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireUserAuth, type UserRequest } from '../middleware/auth.js';
import { parseObjectId } from '../utils/objectId.js';

type TicketsCollectionDocument = {
  _id: ObjectId;
  usuarioId: ObjectId;
  codigoQR: string;
  estado: 'valido' | 'usado' | 'expirado';
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  fechaUso?: Date;
  emitidoPor?: ObjectId;
};

const ticketsRouter = Router();

function mapTicketDocument(ticket: TicketsCollectionDocument) {
  return {
    id: ticket._id.toHexString(),
    usuarioId: ticket.usuarioId.toHexString(),
    codigoQR: ticket.codigoQR,
    estado: ticket.estado,
    fechaCreacion: ticket.fechaCreacion,
    fechaVencimiento: ticket.fechaVencimiento ?? null,
    fechaUso: ticket.fechaUso ?? null,
    emitidoPor: ticket.emitidoPor?.toHexString() ?? null,
  };
}

ticketsRouter.get(
  '/users/:userId/active',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseObjectId(req.params.userId, 'userId');

      if (req.user === undefined || req.user.userId !== userId.toHexString()) {
        res.status(403).json({ message: 'No tienes permisos para acceder a estos tickets.' });
        return;
      }

      const db = await connectToDatabase();
      const tickets = await db
        .collection<TicketsCollectionDocument>('Tickets')
        .find({ usuarioId: userId, estado: 'valido' })
        .sort({ fechaCreacion: -1 })
        .toArray();

      res.json({ tickets: tickets.map(mapTicketDocument) });
    } catch (error) {
      next(error);
    }
  }
);

ticketsRouter.get(
  '/users/:userId/history',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseObjectId(req.params.userId, 'userId');

      if (req.user === undefined || req.user.userId !== userId.toHexString()) {
        res.status(403).json({ message: 'No tienes permisos para acceder a estos tickets.' });
        return;
      }

      const db = await connectToDatabase();
      const collection = db.collection<TicketsCollectionDocument>('Tickets');
      
      // Obtener todos los tickets expirados/usados
      const allExpiredTickets = await collection
        .find({ usuarioId: userId, estado: { $in: ['usado', 'expirado'] } })
        .toArray();

      // Ordenar por fecha de uso (si existe), luego por fecha de vencimiento, luego por fecha de creación
      // Más recientes primero (FIFO: los más antiguos se eliminan)
      allExpiredTickets.sort((a, b) => {
        // Prioridad 1: fechaUso (si existe)
        if (a.fechaUso && b.fechaUso) {
          return b.fechaUso.getTime() - a.fechaUso.getTime();
        }
        if (a.fechaUso) return -1;
        if (b.fechaUso) return 1;
        
        // Prioridad 2: fechaVencimiento (si existe)
        if (a.fechaVencimiento && b.fechaVencimiento) {
          return b.fechaVencimiento.getTime() - a.fechaVencimiento.getTime();
        }
        if (a.fechaVencimiento) return -1;
        if (b.fechaVencimiento) return 1;
        
        // Prioridad 3: fechaCreacion
        return b.fechaCreacion.getTime() - a.fechaCreacion.getTime();
      });

      // Mantener solo los 3 más recientes (FIFO: eliminar los más antiguos)
      const MAX_EXPIRED_TICKETS = 3;
      const ticketsToKeep = allExpiredTickets.slice(0, MAX_EXPIRED_TICKETS);
      const ticketsToDelete = allExpiredTickets.slice(MAX_EXPIRED_TICKETS);

      // Eliminar los tickets más antiguos de la base de datos
      if (ticketsToDelete.length > 0) {
        const idsToDelete = ticketsToDelete.map((t) => t._id);
        await collection.deleteMany({ _id: { $in: idsToDelete } });
      }

      res.json({ tickets: ticketsToKeep.map(mapTicketDocument) });
    } catch (error) {
      next(error);
    }
  }
);

ticketsRouter.patch(
  '/:ticketId/use',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticketId = parseObjectId(req.params.ticketId, 'ticketId');
      const adminIdRaw = req.body?.adminId as string | undefined;
      const adminId = adminIdRaw !== undefined ? parseObjectId(adminIdRaw, 'adminId') : undefined;

      const db = await connectToDatabase();
      const rawResult = await db.collection<TicketsCollectionDocument>('Tickets').findOneAndUpdate(
        { _id: ticketId, estado: 'valido' },
        {
          $set: {
            estado: 'usado',
            fechaUso: new Date(),
            emitidoPor: adminId ?? undefined,
          },
        },
        { returnDocument: 'after' as const }
      );

      const result: any = rawResult as any;

      const updatedTicket = (result?.value ?? null) as TicketsCollectionDocument | null;

      if (updatedTicket === null) {
        res.status(404).json({ message: 'Ticket no encontrado o ya utilizado.' });
        return;
      }

      res.json({ ticket: mapTicketDocument(updatedTicket as TicketsCollectionDocument) });
    } catch (error) {
      next(error);
    }
  }
);

export { ticketsRouter };

