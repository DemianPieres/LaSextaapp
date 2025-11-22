import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';
import { parseObjectId } from '../utils/objectId.js';

export type RewardDocument = {
  _id: ObjectId;
  nombre: string;
  puntosRequeridos: number;
  descripcion: string;
  imagenUrl?: string;
  habilitado: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RewardDto = {
  id: string;
  nombre: string;
  puntosRequeridos: number;
  descripcion: string;
  imagenUrl: string | null;
  habilitado: boolean;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION_NAME = 'Rewards';

function validateStringField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`El campo ${fieldName} es obligatorio.`), { status: 400 });
  }
  return value.trim();
}

function sanitizeReward(document: RewardDocument): RewardDto {
  return {
    id: document._id.toHexString(),
    nombre: document.nombre,
    puntosRequeridos: document.puntosRequeridos,
    descripcion: document.descripcion,
    imagenUrl: document.imagenUrl ?? null,
    habilitado: document.habilitado,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

// ===== ROUTER PÚBLICO (para usuarios) =====
const rewardsRouter = Router();

// GET /api/rewards - Obtener todos los premios habilitados
rewardsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await connectToDatabase();
    const rewards = await db
      .collection<RewardDocument>(COLLECTION_NAME)
      .find({ habilitado: true })
      .sort({ puntosRequeridos: 1, createdAt: -1 })
      .toArray();

    res.json({ rewards: rewards.map(sanitizeReward) });
  } catch (error) {
    next(error);
  }
});

// ===== ROUTER ADMIN =====
const adminRewardsRouter = Router();

adminRewardsRouter.use(requireAdminAuth);

// GET /api/admin/rewards - Obtener todos los premios (incluye deshabilitados)
adminRewardsRouter.get('/', async (_req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const db = await connectToDatabase();
    const rewards = await db
      .collection<RewardDocument>(COLLECTION_NAME)
      .find({})
      .sort({ puntosRequeridos: 1, createdAt: -1 })
      .toArray();

    res.json({ rewards: rewards.map(sanitizeReward) });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/rewards - Crear nuevo premio
adminRewardsRouter.post('/', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, puntosRequeridos, descripcion, imagenUrl, habilitado } = req.body ?? {};

    if (typeof puntosRequeridos !== 'number' || puntosRequeridos < 1) {
      res.status(400).json({ message: 'Los puntos requeridos deben ser un número mayor a 0.' });
      return;
    }

    const newReward: RewardDocument = {
      _id: new ObjectId(),
      nombre: validateStringField(nombre, 'nombre'),
      puntosRequeridos: Math.floor(puntosRequeridos),
      descripcion: validateStringField(descripcion, 'descripcion'),
      imagenUrl: typeof imagenUrl === 'string' && imagenUrl.trim() !== '' ? imagenUrl.trim() : undefined,
      habilitado: habilitado === false ? false : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await connectToDatabase();
    await db.collection<RewardDocument>(COLLECTION_NAME).insertOne(newReward);

    const rewardResponse = sanitizeReward(newReward);

    res.status(201).json({ reward: rewardResponse });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/rewards/:rewardId - Actualizar premio
adminRewardsRouter.put('/:rewardId', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const rewardId = parseObjectId(req.params.rewardId, 'rewardId');
    const { nombre, puntosRequeridos, descripcion, imagenUrl, habilitado } = req.body ?? {};

    const update: Partial<RewardDocument> = {
      updatedAt: new Date(),
    };

    if (nombre !== undefined) {
      update.nombre = validateStringField(nombre, 'nombre');
    }
    if (puntosRequeridos !== undefined) {
      if (typeof puntosRequeridos !== 'number' || puntosRequeridos < 1) {
        res.status(400).json({ message: 'Los puntos requeridos deben ser un número mayor a 0.' });
        return;
      }
      update.puntosRequeridos = Math.floor(puntosRequeridos);
    }
    if (descripcion !== undefined) {
      update.descripcion = validateStringField(descripcion, 'descripcion');
    }
    if (imagenUrl !== undefined) {
      update.imagenUrl = typeof imagenUrl === 'string' && imagenUrl.trim() !== '' ? imagenUrl.trim() : undefined;
    }
    if (habilitado !== undefined) {
      update.habilitado = Boolean(habilitado);
    }

    const db = await connectToDatabase();
    const result = await db
      .collection<RewardDocument>(COLLECTION_NAME)
      .findOneAndUpdate({ _id: rewardId }, { $set: update }, { returnDocument: 'after' });

    const updatedReward = result.value ?? null;

    if (updatedReward === null) {
      res.status(404).json({ message: 'Premio no encontrado.' });
      return;
    }

    const rewardResponse = sanitizeReward(updatedReward);

    res.json({ reward: rewardResponse });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/rewards/:rewardId - Eliminar premio
adminRewardsRouter.delete('/:rewardId', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const rewardId = parseObjectId(req.params.rewardId, 'rewardId');

    const db = await connectToDatabase();
    const result = await db.collection<RewardDocument>(COLLECTION_NAME).deleteOne({ _id: rewardId });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Premio no encontrado.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { adminRewardsRouter, rewardsRouter, sanitizeReward };

