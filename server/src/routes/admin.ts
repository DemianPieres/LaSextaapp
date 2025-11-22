import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';
import { sendTicketEmail } from '../utils/email.js';
import { parseObjectId } from '../utils/objectId.js';
import { signAdminToken } from '../utils/jwt.js';
import { verifyPassword } from '../utils/password.js';
import { computeExpirationDate, generateTicketCode } from '../utils/tickets.js';
import { adminEventsRouter } from './events.js';
import { createNotification } from './notifications.js';
import { adminBenefitsRouter } from './benefits.js';
import { adminPointsRouter } from './points.js';

type UserDocument = {
  _id: ObjectId;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'cliente';
  fechaRegistro: Date;
};

type TicketDocument = {
  _id: ObjectId;
  usuarioId: ObjectId;
  codigoQR: string;
  estado: 'valido' | 'usado' | 'expirado';
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  fechaUso?: Date;
  emitidoPor?: ObjectId;
};

const adminRouter = Router();

function sanitizeUser(user: UserDocument) {
  return {
    id: user._id.toHexString(),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    fechaRegistro: user.fechaRegistro,
  };
}

adminRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ message: 'Credenciales inválidas.' });
        return;
      }

      const db = await connectToDatabase();
      const adminUser = await db.collection<UserDocument>("Usuarios").findOne({
        email: email.toLowerCase(),
        rol: 'admin',
      });

      if (adminUser === null) {
        res.status(401).json({ message: 'Credenciales incorrectas.' });
        return;
      }

      const passwordMatches = await verifyPassword(password, adminUser.passwordHash);

      if (!passwordMatches) {
        res.status(401).json({ message: 'Credenciales incorrectas.' });
        return;
      }

      const token = signAdminToken({
        userId: adminUser._id.toHexString(),
        email: adminUser.email,
        role: 'admin',
      });

      res.json({
        admin: sanitizeUser(adminUser),
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.use(requireAdminAuth);

adminRouter.use('/events', adminEventsRouter);
adminRouter.use('/benefits', adminBenefitsRouter);
adminRouter.use('/points', adminPointsRouter);

adminRouter.get(
  '/me',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.admin) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const db = await connectToDatabase();
      const adminUser = await db.collection<UserDocument>("Usuarios").findOne({
        _id: new ObjectId(req.admin.userId),
        rol: 'admin',
      });

      if (adminUser === null) {
        res.status(404).json({ message: 'Administrador no encontrado.' });
        return;
      }

      res.json({ admin: sanitizeUser(adminUser) });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.get(
  '/users',
  async (_req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const users = await db
        .collection<UserDocument>("Usuarios")
        .aggregate([
          { $match: { rol: { $ne: 'admin' } } },
          {
            $lookup: {
              from: "Tickets",
              localField: '_id',
              foreignField: 'usuarioId',
              as: 'tickets',
            },
          },
          {
            $addFields: {
              ticketsActivos: {
                $size: {
                  $filter: {
                    input: '$tickets',
                    as: 'ticket',
                    cond: { $eq: ['$$ticket.estado', 'valido'] },
                  },
                },
              },
            },
          },
          {
            $project: {
              passwordHash: 0,
              tickets: 0,
            },
          },
          { $sort: { nombre: 1 } },
        ])
        .toArray();

      res.json({ users: users.map((user) => ({ ...sanitizeUser(user as UserDocument), ticketsActivos: (user as any).ticketsActivos ?? 0 })) });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.get(
  '/tickets/all',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const estadoQuery = req.query.estado as string | undefined;
      const estadosPermitidos = ['valido', 'usado', 'expirado'] as const;

      const filtroEstado =
        estadoQuery !== undefined && estadosPermitidos.includes(estadoQuery as any)
          ? estadoQuery
          : undefined;

      const db = await connectToDatabase();
      const tickets = await db
        .collection<TicketDocument>("Tickets")
        .aggregate([
          ...(filtroEstado ? [{ $match: { estado: filtroEstado } }] : []),
          {
            $lookup: {
              from: "Usuarios",
              localField: 'usuarioId',
              foreignField: '_id',
              as: 'usuario',
              pipeline: [{ $project: { nombre: 1, email: 1 } }],
            },
          },
          { $unwind: '$usuario' },
          { $sort: { fechaCreacion: -1 } },
        ])
        .toArray();

      res.json({
        tickets: tickets.map((ticket) => ({
          id: ticket._id.toHexString(),
          usuario: ticket.usuario,
          codigoQR: ticket.codigoQR,
          estado: ticket.estado,
          fechaCreacion: ticket.fechaCreacion,
          fechaUso: ticket.fechaUso ?? null,
          fechaVencimiento: ticket.fechaVencimiento ?? null,
          emitidoPor: ticket.emitidoPor?.toHexString() ?? null,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.get(
  '/tickets/user/:userId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const usuarioId = parseObjectId(req.params.userId, 'userId');

      const db = await connectToDatabase();
      const tickets = await db
        .collection<TicketDocument>("Tickets")
        .find({ usuarioId })
        .sort({ fechaCreacion: -1 })
        .toArray();

      res.json({
        tickets: tickets.map((ticket) => ({
          id: ticket._id.toHexString(),
          codigoQR: ticket.codigoQR,
          estado: ticket.estado,
          fechaCreacion: ticket.fechaCreacion,
          fechaVencimiento: ticket.fechaVencimiento ?? null,
          fechaUso: ticket.fechaUso ?? null,
          emitidoPor: ticket.emitidoPor?.toHexString() ?? null,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  '/tickets/generate',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, diasValidez } = req.body ?? {};

      if (typeof userId !== 'string') {
        res.status(400).json({ message: 'userId es requerido.' });
        return;
      }

      const usuarioId = parseObjectId(userId, 'userId');
      const db = await connectToDatabase();

      const user = await db.collection<UserDocument>("Usuarios").findOne({ _id: usuarioId });
      if (user === null) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      const now = new Date();
      const codigoQR = generateTicketCode();
      const fechaVencimiento = computeExpirationDate(
        typeof diasValidez === 'number' && diasValidez > 0 ? diasValidez : undefined
      );
      const adminId = req.admin ? parseObjectId(req.admin.userId, 'adminId') : undefined;
      const ticketId = new ObjectId();

      // Obtener todos los tickets del usuario ordenados por fecha de creación (más antiguos primero)
      const existingTickets = await db
        .collection<TicketDocument>("Tickets")
        .find({ usuarioId })
        .sort({ fechaCreacion: 1 })
        .toArray();

      // Si ya hay 2 o más tickets, eliminar los más antiguos para mantener solo 2
      if (existingTickets.length >= 2) {
        // Eliminar todos excepto el más reciente (mantener solo 1, luego agregamos el nuevo = 2 total)
        const ticketsToDelete = existingTickets.slice(0, existingTickets.length - 1);
        if (ticketsToDelete.length > 0) {
          const idsToDelete = ticketsToDelete.map((t) => t._id);
          await db.collection<TicketDocument>("Tickets").deleteMany({
            _id: { $in: idsToDelete },
          });
        }
      }

      const ticketDocument: TicketDocument = {
        _id: ticketId,
        usuarioId,
        codigoQR,
        estado: 'valido',
        fechaCreacion: now,
        fechaVencimiento,
        emitidoPor: adminId,
      };

      await db.collection<TicketDocument>("Tickets").insertOne(ticketDocument);

      res.status(201).json({
        ticket: {
          id: ticketId.toHexString(),
          codigoQR,
          fechaCreacion: now,
          fechaVencimiento,
          estado: 'valido' as const,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  '/tickets/send/:userId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { ticketId } = req.body ?? {};
      const userIdParam = req.params.userId;

      if (typeof ticketId !== 'string') {
        res.status(400).json({ message: 'ticketId es requerido en el cuerpo.' });
        return;
      }

      const usuarioId = parseObjectId(userIdParam, 'userId');
      const ticketObjectId = parseObjectId(ticketId, 'ticketId');

      const db = await connectToDatabase();

      const ticket = await db
        .collection<TicketDocument>("Tickets")
        .findOne({ _id: ticketObjectId, usuarioId });

      if (ticket === null) {
        res.status(404).json({ message: 'Ticket no encontrado para este usuario.' });
        return;
      }

      const user = await db.collection<UserDocument>("Usuarios").findOne({ _id: usuarioId });
      if (user === null) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      await sendTicketEmail({
        to: user.email,
        userName: user.nombre,
        ticketCode: ticket.codigoQR,
        issuedAt: ticket.fechaCreacion,
        expiresAt: ticket.fechaVencimiento ?? null,
        description: 'Ticket válido por una bebida gratuita.',
      });

      // Crear notificación para el usuario
      await createNotification(
        usuarioId,
        'ticket',
        '¡Nuevo Ticket Recibido!',
        `Has recibido un nuevo ticket. Código: ${ticket.codigoQR}`,
        { ticketId: ticketObjectId.toHexString() }
      );

      res.json({ message: 'Ticket enviado correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.put(
  '/tickets/use/:ticketId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const ticketId = parseObjectId(req.params.ticketId, 'ticketId');
      const adminId = req.admin ? parseObjectId(req.admin.userId, 'adminId') : undefined;

      const db = await connectToDatabase();
      const result = await db
        .collection<TicketDocument>("Tickets")
        .findOneAndUpdate(
          { _id: ticketId, estado: 'valido' },
          {
            $set: {
              estado: 'usado',
              fechaUso: new Date(),
              emitidoPor: adminId,
            },
          },
          { returnDocument: 'after' }
        );

      const updatedTicket = (result as any)?.value ?? null;

      if (updatedTicket === null) {
        res.status(404).json({ message: 'Ticket no encontrado o ya utilizado.' });
        return;
      }

      res.json({ ticket: updatedTicket });
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.post(
  '/tickets/validate/:codigoQR',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const codigoQR = req.params.codigoQR;

      if (typeof codigoQR !== 'string' || codigoQR.trim() === '') {
        res.status(400).json({ message: 'Código QR inválido.' });
        return;
      }

      const db = await connectToDatabase();
      const result = await db
        .collection<TicketDocument>("Tickets")
        .findOneAndUpdate(
          { codigoQR, estado: 'valido' },
          {
            $set: {
              estado: 'usado',
              fechaUso: new Date(),
              emitidoPor: req.admin ? parseObjectId(req.admin.userId, 'adminId') : undefined,
            },
          },
          { returnDocument: 'after' }
        );

      const updatedTicket = (result as any)?.value ?? null;

      if (updatedTicket === null) {
        res.status(404).json({ message: 'Código QR inválido o ya utilizado.' });
        return;
      }

      res.json({
        ticket: {
          id: updatedTicket._id.toHexString(),
          usuarioId: updatedTicket.usuarioId.toHexString(),
          estado: updatedTicket.estado,
          fechaUso: updatedTicket.fechaUso ?? null,
          codigoQR: updatedTicket.codigoQR,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { adminRouter };

