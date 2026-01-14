import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireUserAuth, type UserRequest } from '../middleware/auth.js';
import { signUserToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendPasswordResetEmail } from '../utils/email.js';

type UserDocument = {
  _id: ObjectId;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'cliente';
  fechaRegistro: Date;
};

type PasswordResetCode = {
  _id: ObjectId;
  email: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
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

// Función para generar código de 6 dígitos
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password - Solicitar código de recuperación
authRouter.post(
  '/forgot-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body ?? {};

      if (typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({ message: 'Email requerido.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const db = await connectToDatabase();

      // Buscar usuario
      const user = await db.collection<UserDocument>('Usuarios').findOne({ 
        email: normalizedEmail,
        rol: 'cliente'
      });

      // Por seguridad, no revelamos si el email existe o no
      // Pero solo enviamos el código si el usuario existe
      if (user !== null) {
        try {
          // Invalidar códigos anteriores no usados para este email
          await db.collection<PasswordResetCode>('PasswordResetCodes').updateMany(
            { email: normalizedEmail, used: false },
            { $set: { used: true } }
          );

          // Generar nuevo código
          const code = generateResetCode();
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos

          const resetCode: PasswordResetCode = {
            _id: new ObjectId(),
            email: normalizedEmail,
            code,
            createdAt: now,
            expiresAt,
            used: false,
          };

          await db.collection<PasswordResetCode>('PasswordResetCodes').insertOne(resetCode);

          // Enviar email
          try {
            await sendPasswordResetEmail({
              to: normalizedEmail,
              userName: user.nombre,
              resetCode: code,
            });
            console.log(`[forgot-password] Código de recuperación enviado a ${normalizedEmail}`);
          } catch (emailError: any) {
            console.error('[forgot-password] Error al enviar email:', emailError);
            // No fallamos la petición si el email falla, pero lo registramos
            // El código ya fue guardado en la BD, así que el usuario puede pedir que se reenvíe
          }
        } catch (dbError) {
          console.error('[forgot-password] Error al procesar solicitud:', dbError);
          // Si hay un error de BD, lo propagamos
          throw dbError;
        }
      }

      // Siempre devolvemos éxito por seguridad (no revelamos si el email existe)
      res.json({ message: 'Si el email existe, se envió un código de recuperación.' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/verify-reset-code - Verificar código de recuperación
authRouter.post(
  '/verify-reset-code',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body ?? {};

      if (typeof email !== 'string' || typeof code !== 'string') {
        res.status(400).json({ message: 'Email y código son requeridos.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = code.trim();

      if (trimmedCode.length !== 6) {
        res.status(400).json({ message: 'El código debe tener 6 dígitos.' });
        return;
      }

      const db = await connectToDatabase();
      const resetCode = await db.collection<PasswordResetCode>('PasswordResetCodes').findOne({
        email: normalizedEmail,
        code: trimmedCode,
        used: false,
      });

      if (resetCode === null) {
        res.status(400).json({ message: 'Código inválido.' });
        return;
      }

      // Verificar expiración
      if (new Date() > resetCode.expiresAt) {
        await db.collection<PasswordResetCode>('PasswordResetCodes').updateOne(
          { _id: resetCode._id },
          { $set: { used: true } }
        );
        res.status(400).json({ message: 'El código ha expirado.' });
        return;
      }

      res.json({ message: 'Código verificado correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/reset-password - Restablecer contraseña
authRouter.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, newPassword } = req.body ?? {};

      if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
        res.status(400).json({ message: 'Email, código y nueva contraseña son requeridos.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = code.trim();

      if (newPassword.trim().length < 6) {
        res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
      }

      const db = await connectToDatabase();

      // Verificar código
      const resetCode = await db.collection<PasswordResetCode>('PasswordResetCodes').findOne({
        email: normalizedEmail,
        code: trimmedCode,
        used: false,
      });

      if (resetCode === null) {
        res.status(400).json({ message: 'Código inválido.' });
        return;
      }

      // Verificar expiración
      if (new Date() > resetCode.expiresAt) {
        await db.collection<PasswordResetCode>('PasswordResetCodes').updateOne(
          { _id: resetCode._id },
          { $set: { used: true } }
        );
        res.status(400).json({ message: 'El código ha expirado.' });
        return;
      }

      // Buscar usuario
      const user = await db.collection<UserDocument>('Usuarios').findOne({
        email: normalizedEmail,
        rol: 'cliente',
      });

      if (user === null) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      // Actualizar contraseña
      const newPasswordHash = await hashPassword(newPassword);
      await db.collection<UserDocument>('Usuarios').updateOne(
        { _id: user._id },
        { $set: { passwordHash: newPasswordHash } }
      );

      // Marcar código como usado
      await db.collection<PasswordResetCode>('PasswordResetCodes').updateOne(
        { _id: resetCode._id },
        { $set: { used: true } }
      );

      res.json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/change-password - Cambiar contraseña del usuario autenticado
authRouter.post(
  '/change-password',
  requireUserAuth,
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user === undefined) {
        res.status(401).json({ message: 'Autenticación requerida.' });
        return;
      }

      const { currentPassword, newPassword } = req.body ?? {};

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas.' });
        return;
      }

      if (newPassword.trim().length < 6) {
        res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        return;
      }

      const db = await connectToDatabase();

      const user = await db.collection<UserDocument>('Usuarios').findOne({
        _id: new ObjectId(req.user.userId),
        rol: 'cliente',
      });

      if (user === null) {
        res.status(404).json({ message: 'Usuario no encontrado.' });
        return;
      }

      const matches = await verifyPassword(currentPassword, user.passwordHash);

      if (!matches) {
        res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        return;
      }

      const newPasswordHash = await hashPassword(newPassword);

      await db.collection<UserDocument>('Usuarios').updateOne(
        { _id: user._id },
        { $set: { passwordHash: newPasswordHash } }
      );

      res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

export { authRouter };

