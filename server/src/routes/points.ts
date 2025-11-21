import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';
import { parseObjectId } from '../utils/objectId.js';
import { verifyUserToken } from '../utils/jwt.js';

export type PointsTransaction = {
  _id: ObjectId;
  usuarioId: ObjectId;
  tipo: 'carga' | 'canje';
  cantidad: number;
  descripcion: string;
  fecha: Date;
  procesadoPor: ObjectId; // admin que procesó la transacción
};

export type RedeemCode = {
  _id: ObjectId;
  usuarioId: ObjectId;
  codigo: string;
  puntosACanjear: number;
  estado: 'pendiente' | 'usado' | 'expirado';
  fechaCreacion: Date;
  fechaExpiracion: Date;
  fechaUso?: Date;
};

const COLLECTION_USERS = 'Usuarios';
const COLLECTION_TRANSACTIONS = 'PointsTransactions';
const COLLECTION_REDEEM_CODES = 'RedeemCodes';
const MIN_POINTS_TO_REDEEM = 25;

// Función para verificar si ya se cargó un punto hoy
async function canAddPointToday(usuarioId: ObjectId): Promise<boolean> {
  const db = await connectToDatabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTransaction = await db.collection<PointsTransaction>(COLLECTION_TRANSACTIONS).findOne({
    usuarioId,
    tipo: 'carga',
    fecha: { $gte: today, $lt: tomorrow },
  });

  return todayTransaction === null;
}

// Generar código único para canje
function generateRedeemCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REDEEM-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===== ROUTER CLIENTE =====
const pointsRouter = Router();

// GET /api/points/me - Obtener puntos del usuario autenticado
pointsRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      res.status(401).json({ message: 'Token de autenticación requerido.' });
      return;
    }

    let payload;
    try {
      payload = verifyUserToken(token);
    } catch {
      res.status(401).json({ message: 'Token inválido o expirado.' });
      return;
    }

    const db = await connectToDatabase();
    const user = await db.collection(COLLECTION_USERS).findOne({ _id: new ObjectId(payload.userId) });

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    res.json({ puntos: user.puntos ?? 0 });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/movements - Obtener movimientos de puntos del usuario
pointsRouter.get('/movements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      res.status(401).json({ message: 'Token de autenticación requerido.' });
      return;
    }

    let payload;
    try {
      payload = verifyUserToken(token);
    } catch {
      res.status(401).json({ message: 'Token inválido o expirado.' });
      return;
    }

    const db = await connectToDatabase();
    const movements = await db
      .collection<PointsTransaction>(COLLECTION_TRANSACTIONS)
      .find({ usuarioId: new ObjectId(payload.userId) })
      .sort({ fecha: -1 })
      .limit(50)
      .toArray();

    const movementsDto = movements.map((m) => ({
      id: m._id.toHexString(),
      tipo: m.tipo,
      cantidad: m.cantidad,
      descripcion: m.descripcion,
      fecha: m.fecha.toISOString(),
    }));

    res.json({ movements: movementsDto });
  } catch (error) {
    next(error);
  }
});

// POST /api/points/generate-redeem-code - Generar código de canje
pointsRouter.post('/generate-redeem-code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      res.status(401).json({ message: 'Token de autenticación requerido.' });
      return;
    }

    let payload;
    try {
      payload = verifyUserToken(token);
    } catch {
      res.status(401).json({ message: 'Token inválido o expirado.' });
      return;
    }

    const { puntosACanjear } = req.body ?? {};

    if (typeof puntosACanjear !== 'number' || puntosACanjear < MIN_POINTS_TO_REDEEM) {
      res.status(400).json({ message: `Debe canjear un mínimo de ${MIN_POINTS_TO_REDEEM} puntos.` });
      return;
    }

    const db = await connectToDatabase();
    const userId = new ObjectId(payload.userId);
    const user = await db.collection(COLLECTION_USERS).findOne({ _id: userId });

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    const userPoints = user.puntos ?? 0;
    if (userPoints < puntosACanjear) {
      res.status(400).json({ message: 'No tienes suficientes puntos.' });
      return;
    }

    // Verificar si ya tiene un código pendiente
    const existingCode = await db.collection<RedeemCode>(COLLECTION_REDEEM_CODES).findOne({
      usuarioId: userId,
      estado: 'pendiente',
    });

    if (existingCode) {
      res.status(400).json({ message: 'Ya tienes un código de canje pendiente.' });
      return;
    }

    // Crear nuevo código de canje
    const now = new Date();
    const expiration = new Date(now.getTime() + 15 * 60 * 1000); // Expira en 15 minutos

    const redeemCode: RedeemCode = {
      _id: new ObjectId(),
      usuarioId: userId,
      codigo: generateRedeemCode(),
      puntosACanjear,
      estado: 'pendiente',
      fechaCreacion: now,
      fechaExpiracion: expiration,
    };

    await db.collection<RedeemCode>(COLLECTION_REDEEM_CODES).insertOne(redeemCode);

    res.status(201).json({
      codigo: redeemCode.codigo,
      puntosACanjear: redeemCode.puntosACanjear,
      fechaExpiracion: redeemCode.fechaExpiracion.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ===== ROUTER ADMIN =====
const adminPointsRouter = Router();

adminPointsRouter.use(requireAdminAuth);

// POST /api/admin/points/add - Agregar punto a usuario (máximo 1 por día)
adminPointsRouter.post('/add', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { usuarioId } = req.body ?? {};

    if (!usuarioId || !ObjectId.isValid(usuarioId)) {
      res.status(400).json({ message: 'ID de usuario inválido.' });
      return;
    }

    const userObjectId = new ObjectId(usuarioId);
    const adminId = new ObjectId(req.admin!.userId);

    // Verificar si ya se agregó punto hoy
    const canAdd = await canAddPointToday(userObjectId);
    if (!canAdd) {
      res.status(400).json({ message: 'Ya se agregó 1 punto a este usuario hoy. Intenta mañana.' });
      return;
    }

    const db = await connectToDatabase();

    // Agregar punto al usuario
    const result = await db.collection(COLLECTION_USERS).findOneAndUpdate(
      { _id: userObjectId, rol: 'cliente' },
      { $inc: { puntos: 1 } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    // Registrar transacción
    const transaction: PointsTransaction = {
      _id: new ObjectId(),
      usuarioId: userObjectId,
      tipo: 'carga',
      cantidad: 1,
      descripcion: 'Punto agregado por administrador',
      fecha: new Date(),
      procesadoPor: adminId,
    };

    await db.collection<PointsTransaction>(COLLECTION_TRANSACTIONS).insertOne(transaction);

    res.json({
      message: 'Punto agregado correctamente.',
      nuevosPuntos: result.value.puntos ?? 1,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/points/validate-redeem - Validar y procesar código de canje
adminPointsRouter.post('/validate-redeem', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const { codigo } = req.body ?? {};

    if (!codigo || typeof codigo !== 'string') {
      res.status(400).json({ message: 'Código de canje inválido.' });
      return;
    }

    const db = await connectToDatabase();
    const adminId = new ObjectId(req.admin!.userId);

    // Buscar código de canje
    const redeemCode = await db.collection<RedeemCode>(COLLECTION_REDEEM_CODES).findOne({
      codigo: codigo.trim(),
      estado: 'pendiente',
    });

    if (!redeemCode) {
      res.status(404).json({ message: 'Código no encontrado o ya fue usado.' });
      return;
    }

    // Verificar si expiró
    if (new Date() > redeemCode.fechaExpiracion) {
      await db.collection<RedeemCode>(COLLECTION_REDEEM_CODES).updateOne(
        { _id: redeemCode._id },
        { $set: { estado: 'expirado' } }
      );
      res.status(400).json({ message: 'El código ha expirado.' });
      return;
    }

    // Obtener usuario
    const user = await db.collection(COLLECTION_USERS).findOne({ _id: redeemCode.usuarioId });

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    const userPoints = user.puntos ?? 0;
    if (userPoints < redeemCode.puntosACanjear) {
      res.status(400).json({ message: 'El usuario no tiene suficientes puntos.' });
      return;
    }

    // Procesar canje
    await db.collection(COLLECTION_USERS).updateOne(
      { _id: redeemCode.usuarioId },
      { $inc: { puntos: -redeemCode.puntosACanjear } }
    );

    // Marcar código como usado
    await db.collection<RedeemCode>(COLLECTION_REDEEM_CODES).updateOne(
      { _id: redeemCode._id },
      { $set: { estado: 'usado', fechaUso: new Date() } }
    );

    // Registrar transacción
    const transaction: PointsTransaction = {
      _id: new ObjectId(),
      usuarioId: redeemCode.usuarioId,
      tipo: 'canje',
      cantidad: redeemCode.puntosACanjear,
      descripcion: `Canje de ${redeemCode.puntosACanjear} puntos`,
      fecha: new Date(),
      procesadoPor: adminId,
    };

    await db.collection<PointsTransaction>(COLLECTION_TRANSACTIONS).insertOne(transaction);

    res.json({
      message: 'Canje procesado correctamente.',
      usuario: user.nombre,
      puntosCanjeados: redeemCode.puntosACanjear,
      puntosRestantes: userPoints - redeemCode.puntosACanjear,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/points/check-eligibility/:usuarioId - Verificar si se puede agregar punto hoy
adminPointsRouter.get('/check-eligibility/:usuarioId', async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const usuarioId = parseObjectId(req.params.usuarioId, 'usuarioId');
    const canAdd = await canAddPointToday(usuarioId);

    res.json({ canAddToday: canAdd });
  } catch (error) {
    next(error);
  }
});

export { pointsRouter, adminPointsRouter };

