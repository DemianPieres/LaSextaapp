import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireUserAuth, type UserRequest } from '../middleware/auth.js';
import { signUserToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

type UserDocument = {
  _id: ObjectId;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'cliente';
  fechaRegistro: Date;
};

const authRouter = Router();

function sanitizeUser(user: UserDocument) {
  return {
    id: user._id.toHexString(),
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    fechaRegistro: user.fechaRegistro,
  };
}

authRouter.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, nombre } = req.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string' || typeof nombre !== 'string') {
        res.status(400).json({ message: 'Datos inválidos. Email, contraseña y nombre son requeridos.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = nombre.trim();

      if (normalizedEmail === '' || trimmedName === '' || password.trim().length < 6) {
        res.status(400).json({ message: 'Revisa que los campos sean válidos y la contraseña tenga al menos 6 caracteres.' });
        return;
      }

      const db = await connectToDatabase();
      const existingUser = await db.collection<UserDocument>('Usuarios').findOne({ email: normalizedEmail });

      if (existingUser !== null) {
        res.status(409).json({ message: 'Ya existe un usuario con ese email.' });
        return;
      }

      const now = new Date();
      const passwordHash = await hashPassword(password);
      const userDocument: UserDocument = {
        _id: new ObjectId(),
        email: normalizedEmail,
        nombre: trimmedName,
        passwordHash,
        rol: 'cliente',
        fechaRegistro: now,
      };

      await db.collection<UserDocument>('Usuarios').insertOne(userDocument);

      const token = signUserToken({
        userId: userDocument._id.toHexString(),
        email: userDocument.email,
        role: 'cliente',
      });

      res.status(201).json({
        user: sanitizeUser(userDocument),
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ message: 'Credenciales inválidas.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      const db = await connectToDatabase();
      const user = await db.collection<UserDocument>('Usuarios').findOne({ email: normalizedEmail });

      if (user === null || user.rol !== 'cliente') {
        res.status(401).json({ message: 'Credenciales incorrectas.' });
        return;
      }

      const matches = await verifyPassword(password, user.passwordHash);

      if (!matches) {
        res.status(401).json({ message: 'Credenciales incorrectas.' });
        return;
      }

      const token = signUserToken({
        userId: user._id.toHexString(),
        email: user.email,
        role: 'cliente',
      });

      res.json({
        user: sanitizeUser(user),
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.get(
  '/me',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user === undefined) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const db = await connectToDatabase();
      const user = await db
        .collection<UserDocument>('Usuarios')
        .findOne({ _id: new ObjectId(req.user.userId) });

      if (user === null) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

export { authRouter };

