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
      const tickets = await db
        .collection<TicketsCollectionDocument>('Tickets')
        .find({ usuarioId: userId, estado: { $in: ['usado', 'expirado'] } })
        .sort({ fechaUso: -1, fechaCreacion: -1 })
        .toArray();

      res.json({ tickets: tickets.map(mapTicketDocument) });
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
      const result = await db.collection<TicketsCollectionDocument>('Tickets').findOneAndUpdate(
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

