import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';
import { parseObjectId } from '../utils/objectId.js';
import { pushEventStreamPayload, registerStreamClient } from '../utils/eventsStream.js';

export type EventDocument = {
  _id: ObjectId;
  titulo: string;
  fecha: string;
  hora: string;
  dia: string;
  ubicacion: string;
  descripcion?: string;
  imagenFondo?: string | null;
  linkCompra?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EventResponse = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  dia: string;
  ubicacion: string;
  descripcion: string | null;
  imagenFondo: string | null;
  linkCompra: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_LOCATION = 'LA SEXTA';
const DEFAULT_BACKGROUND = '/card1.jpeg';
const COLLECTION_NAME = 'Eventos';

function sanitizeEvent(document: EventDocument): EventResponse {
  return {
    id: document._id.toHexString(),
    titulo: document.titulo,
    fecha: document.fecha,
    hora: document.hora,
    dia: document.dia,
    ubicacion: document.ubicacion,
    descripcion: document.descripcion ?? null,
    imagenFondo: document.imagenFondo ?? DEFAULT_BACKGROUND,
    linkCompra: document.linkCompra ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function validateStringField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`El campo ${fieldName} es obligatorio.`), { status: 400 });
  }
  return value.trim();
}

const eventsRouter = Router();

eventsRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const events = await db
        .collection<EventDocument>(COLLECTION_NAME)
        .find({})
        .sort({ fecha: 1, hora: 1, createdAt: -1 })
        .toArray();

      res.json({
        events: events.map(sanitizeEvent),
      });
    } catch (error) {
      next(error);
    }
  }
);

eventsRouter.get(
  '/stream',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const events = await db
        .collection<EventDocument>(COLLECTION_NAME)
        .find({})
        .sort({ fecha: 1, hora: 1, createdAt: -1 })
        .toArray();

      registerStreamClient(req, res);
      res.write(`data: ${JSON.stringify({ type: 'snapshot', events: events.map(sanitizeEvent) })}\n\n`);
    } catch (error) {
      next(error);
    }
  }
);

const adminEventsRouter = Router();

adminEventsRouter.use(requireAdminAuth);

adminEventsRouter.get(
  '/',
  async (_req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const events = await db
        .collection<EventDocument>(COLLECTION_NAME)
        .find({})
        .sort({ fecha: 1, hora: 1, createdAt: -1 })
        .toArray();

      res.json({ events: events.map(sanitizeEvent) });
    } catch (error) {
      next(error);
    }
  }
);

adminEventsRouter.post(
  '/',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { titulo, fecha, hora, dia, ubicacion, descripcion, imagenFondo, linkCompra } = req.body ?? {};

      const newEvent: EventDocument = {
        _id: new ObjectId(),
        titulo: validateStringField(titulo, 'titulo'),
        fecha: validateStringField(fecha, 'fecha'),
        hora: validateStringField(hora, 'hora'),
        dia: validateStringField(dia, 'dia'),
        ubicacion: typeof ubicacion === 'string' && ubicacion.trim() !== '' ? ubicacion.trim() : DEFAULT_LOCATION,
        descripcion: typeof descripcion === 'string' && descripcion.trim() !== '' ? descripcion.trim() : undefined,
        imagenFondo:
          typeof imagenFondo === 'string' && imagenFondo.trim() !== '' ? imagenFondo.trim() : DEFAULT_BACKGROUND,
        linkCompra: typeof linkCompra === 'string' && linkCompra.trim() !== '' ? linkCompra.trim() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = await connectToDatabase();
      await db.collection<EventDocument>(COLLECTION_NAME).insertOne(newEvent);

      const eventResponse = sanitizeEvent(newEvent);
      pushEventStreamPayload({ type: 'created', event: eventResponse });

      res.status(201).json({ event: eventResponse });
    } catch (error) {
      next(error);
    }
  }
);

adminEventsRouter.put(
  '/:eventId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseObjectId(req.params.eventId, 'eventId');
      const { titulo, fecha, hora, dia, ubicacion, descripcion, imagenFondo, linkCompra } = req.body ?? {};

      const update: Partial<EventDocument> = {
        updatedAt: new Date(),
      };

      if (titulo !== undefined) {
        update.titulo = validateStringField(titulo, 'titulo');
      }
      if (fecha !== undefined) {
        update.fecha = validateStringField(fecha, 'fecha');
      }
      if (hora !== undefined) {
        update.hora = validateStringField(hora, 'hora');
      }
      if (dia !== undefined) {
        update.dia = validateStringField(dia, 'dia');
      }
      if (ubicacion !== undefined) {
        update.ubicacion = typeof ubicacion === 'string' && ubicacion.trim() !== '' ? ubicacion.trim() : DEFAULT_LOCATION;
      }
      if (descripcion !== undefined) {
        update.descripcion = typeof descripcion === 'string' && descripcion.trim() !== '' ? descripcion.trim() : undefined;
      }
      if (imagenFondo !== undefined) {
        update.imagenFondo =
          typeof imagenFondo === 'string' && imagenFondo.trim() !== '' ? imagenFondo.trim() : DEFAULT_BACKGROUND;
      }
      if (linkCompra !== undefined) {
        update.linkCompra = typeof linkCompra === 'string' && linkCompra.trim() !== '' ? linkCompra.trim() : undefined;
      }

      const db = await connectToDatabase();
      const result = await db
        .collection<EventDocument>(COLLECTION_NAME)
        .findOneAndUpdate({ _id: eventId }, { $set: update }, { returnDocument: 'after' });

      const updatedEvent = result.value ?? null;

      if (updatedEvent === null) {
        res.status(404).json({ message: 'Evento no encontrado.' });
        return;
      }

      const eventResponse = sanitizeEvent(updatedEvent);
      pushEventStreamPayload({ type: 'updated', event: eventResponse });

      res.json({ event: eventResponse });
    } catch (error) {
      next(error);
    }
  }
);

adminEventsRouter.delete(
  '/:eventId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const eventId = parseObjectId(req.params.eventId, 'eventId');

      const db = await connectToDatabase();
      const result = await db.collection<EventDocument>(COLLECTION_NAME).deleteOne({ _id: eventId });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: 'Evento no encontrado.' });
        return;
      }

      pushEventStreamPayload({ type: 'deleted', eventId: eventId.toHexString() });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { adminEventsRouter, eventsRouter, sanitizeEvent };





