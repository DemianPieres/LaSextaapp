import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';

type RewardDocument = {
  _id: ObjectId;
  nombre: string;
  puntosRequeridos: number;
  descripcion: string;
  imagenUrl: string | null;
  habilitado: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const COLLECTION_REWARDS = 'Rewards';

const rewardsRouter = Router();
const adminRewardsRouter = Router();

function sanitizeReward(doc: RewardDocument) {
  return {
    id: doc._id.toHexString(),
    nombre: doc.nombre,
    puntosRequeridos: doc.puntosRequeridos,
    descripcion: doc.descripcion,
    imagenUrl: doc.imagenUrl,
    habilitado: doc.habilitado,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ===== RUTAS PÚBLICAS =====

// GET /api/rewards - listar premios visibles para usuarios
rewardsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await connectToDatabase();
    const rewards = await db
      .collection<RewardDocument>(COLLECTION_REWARDS)
      .find({ habilitado: true })
      .sort({ puntosRequeridos: 1, createdAt: -1 })
      .toArray();

    res.json({ rewards: rewards.map(sanitizeReward) });
  } catch (error) {
    next(error);
  }
});

// ===== RUTAS ADMIN =====

adminRewardsRouter.use(requireAdminAuth);

// GET /api/admin/rewards - listar todos los premios
adminRewardsRouter.get('/', async (_req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const db = await connectToDatabase();
    const rewards = await db
      .collection<RewardDocument>(COLLECTION_REWARDS)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ rewards: rewards.map(sanitizeReward) });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/rewards - crear premio
adminRewardsRouter.post('/', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, puntosRequeridos, descripcion, imagenUrl, habilitado } = req.body ?? {};

    if (
      typeof nombre !== 'string' ||
      typeof descripcion !== 'string' ||
      typeof puntosRequeridos !== 'number' ||
      puntosRequeridos <= 0
    ) {
      res.status(400).json({ message: 'Nombre, descripción y puntosRequeridos válidos son requeridos.' });
      return;
    }

    const now = new Date();

    const doc: RewardDocument = {
      _id: new ObjectId(),
      nombre: nombre.trim(),
      puntosRequeridos,
      descripcion: descripcion.trim(),
      imagenUrl: typeof imagenUrl === 'string' && imagenUrl.trim() !== '' ? imagenUrl.trim() : null,
      habilitado: habilitado !== false,
      createdAt: now,
      updatedAt: now,
    };

    const db = await connectToDatabase();
    await db.collection<RewardDocument>(COLLECTION_REWARDS).insertOne(doc);

    res.status(201).json({ reward: sanitizeReward(doc) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/rewards/:rewardId - actualizar premio
adminRewardsRouter.put(
  '/:rewardId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { rewardId } = req.params;
      if (!ObjectId.isValid(rewardId)) {
        res.status(400).json({ message: 'ID de premio inválido.' });
        return;
      }

      const db = await connectToDatabase();
      const updates: Partial<RewardDocument> = { updatedAt: new Date() } as Partial<RewardDocument>;
      const { nombre, puntosRequeridos, descripcion, imagenUrl, habilitado } = req.body ?? {};

      if (typeof nombre === 'string') updates.nombre = nombre.trim();
      if (typeof descripcion === 'string') updates.descripcion = descripcion.trim();
      if (typeof puntosRequeridos === 'number' && puntosRequeridos > 0) {
        updates.puntosRequeridos = puntosRequeridos;
      }
      if (typeof imagenUrl === 'string') {
        updates.imagenUrl = imagenUrl.trim() !== '' ? imagenUrl.trim() : null;
      }
      if (typeof habilitado === 'boolean') {
        updates.habilitado = habilitado;
      }

      const rawResult = await db
        .collection<RewardDocument>(COLLECTION_REWARDS)
        .findOneAndUpdate(
          { _id: new ObjectId(rewardId) },
          { $set: updates },
          { returnDocument: 'after' }
        );

      const result: any = rawResult as any;
      if (!result?.value) {
        res.status(404).json({ message: 'Premio no encontrado.' });
        return;
      }

      res.json({ reward: sanitizeReward(result.value as RewardDocument) });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/admin/rewards/:rewardId - eliminar premio
adminRewardsRouter.delete(
  '/:rewardId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { rewardId } = req.params;
      if (!ObjectId.isValid(rewardId)) {
        res.status(400).json({ message: 'ID de premio inválido.' });
        return;
      }

      const db = await connectToDatabase();
      const result = await db
        .collection<RewardDocument>(COLLECTION_REWARDS)
        .deleteOne({ _id: new ObjectId(rewardId) });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: 'Premio no encontrado.' });
        return;
      }

      res.json({ message: 'Premio eliminado correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

export { rewardsRouter, adminRewardsRouter, type RewardDocument };
