import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireUserAuth, type UserRequest } from '../middleware/auth.js';
import { signUserToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendPasswordResetCode } from '../utils/email.js';

type UserDocument = {
  _id: ObjectId;
  nombre: string;
  email: string;
  passwordHash?: string;
  rol: 'admin' | 'cliente';
  fechaRegistro: Date;
  socialProvider?: 'facebook' | 'instagram';
  socialId?: string;
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

      if (!user.passwordHash) {
        res.status(401).json({ message: 'Este usuario se registró con una red social. Usa el método de autenticación social.' });
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

// Endpoint para autenticación con redes sociales
authRouter.post(
  '/social',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, accessToken, socialId, email, nombre } = req.body ?? {};

      if (provider !== 'facebook' && provider !== 'instagram') {
        res.status(400).json({ message: 'Proveedor de red social no válido. Solo se acepta Facebook o Instagram.' });
        return;
      }

      if (typeof accessToken !== 'string' || accessToken.trim() === '') {
        res.status(400).json({ message: 'Token de acceso requerido.' });
        return;
      }

      if (typeof socialId !== 'string' || socialId.trim() === '') {
        res.status(400).json({ message: 'ID de red social requerido.' });
        return;
      }

      if (typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({ message: 'Email requerido.' });
        return;
      }

      if (typeof nombre !== 'string' || nombre.trim() === '') {
        res.status(400).json({ message: 'Nombre requerido.' });
        return;
      }

      // Verificar el token con la API de Facebook
      try {
        const verifyUrl = provider === 'facebook' 
          ? `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`
          : `https://graph.instagram.com/me?access_token=${accessToken}&fields=id,username`;

        const verifyResponse = await fetch(verifyUrl);
        
        if (!verifyResponse.ok) {
          res.status(401).json({ message: 'Token de acceso inválido o expirado.' });
          return;
        }

        const socialData = await verifyResponse.json();
        
        // Verificar que el ID coincida
        if (socialData.id !== socialId) {
          res.status(401).json({ message: 'ID de red social no coincide con el token.' });
          return;
        }
      } catch (verifyError) {
        console.error('[auth/social] Error al verificar token:', verifyError);
        res.status(401).json({ message: 'No se pudo verificar el token de acceso.' });
        return;
      }

      const db = await connectToDatabase();
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = nombre.trim();

      // Buscar usuario existente por email o socialId
      const existingUser = await db.collection<UserDocument>('Usuarios').findOne({
        $or: [
          { email: normalizedEmail },
          { socialId, socialProvider: provider }
        ]
      });

      let userDocument: UserDocument;

      if (existingUser !== null) {
        // Usuario existe, actualizar información social si es necesario
        if (!existingUser.socialProvider || !existingUser.socialId) {
          await db.collection<UserDocument>('Usuarios').updateOne(
            { _id: existingUser._id },
            { 
              $set: { 
                socialProvider: provider,
                socialId,
                nombre: trimmedName,
                email: normalizedEmail
              } 
            }
          );
          userDocument = { ...existingUser, socialProvider: provider, socialId, nombre: trimmedName, email: normalizedEmail };
        } else {
          userDocument = existingUser;
        }
      } else {
        // Crear nuevo usuario
        const now = new Date();
        userDocument = {
          _id: new ObjectId(),
          email: normalizedEmail,
          nombre: trimmedName,
          rol: 'cliente',
          fechaRegistro: now,
          socialProvider: provider,
          socialId,
        };

        await db.collection<UserDocument>('Usuarios').insertOne(userDocument);
      }

      const token = signUserToken({
        userId: userDocument._id.toHexString(),
        email: userDocument.email,
        role: 'cliente',
      });

      res.status(existingUser === null ? 201 : 200).json({
        user: sanitizeUser(userDocument),
        token,
      });
    } catch (error) {
      next(error);
    }
  }
);

type PasswordResetCodeDocument = {
  _id: ObjectId;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

// Generar código de 6 dígitos
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint para solicitar código de recuperación
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

      // Verificar que el usuario existe y tiene contraseña (no es usuario social)
      const user = await db.collection<UserDocument>('Usuarios').findOne({ 
        email: normalizedEmail,
        rol: 'cliente'
      });

      if (user === null) {
        // Por seguridad, no revelamos si el email existe o no
        res.json({ message: 'Si el email existe, se enviará un código de recuperación.' });
        return;
      }

      if (!user.passwordHash) {
        res.status(400).json({ message: 'Este usuario se registró con una red social. No puede restablecer contraseña.' });
        return;
      }

      // Generar código de recuperación
      const resetCode = generateResetCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expira en 15 minutos

      // Guardar código en la base de datos
      const resetCodeDoc: PasswordResetCodeDocument = {
        _id: new ObjectId(),
        email: normalizedEmail,
        code: resetCode,
        expiresAt,
        used: false,
        createdAt: new Date(),
      };

      await db.collection<PasswordResetCodeDocument>('PasswordResetCodes').insertOne(resetCodeDoc);

      // Enviar email con el código
      try {
        await sendPasswordResetCode({
          to: normalizedEmail,
          userName: user.nombre,
          resetCode,
        });
      } catch (emailError) {
        console.error('[auth/forgot-password] Error al enviar email:', emailError);
        // Eliminar el código si falla el envío
        await db.collection<PasswordResetCodeDocument>('PasswordResetCodes').deleteOne({ _id: resetCodeDoc._id });
        res.status(500).json({ message: 'Error al enviar el código de recuperación. Intentá nuevamente más tarde.' });
        return;
      }

      res.json({ message: 'Si el email existe, se enviará un código de recuperación.' });
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint para verificar código de recuperación
authRouter.post(
  '/verify-reset-code',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body ?? {};

      if (typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({ message: 'Email requerido.' });
        return;
      }

      if (typeof code !== 'string' || code.trim() === '') {
        res.status(400).json({ message: 'Código requerido.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = code.trim();

      const db = await connectToDatabase();

      // Buscar código válido
      const resetCodeDoc = await db.collection<PasswordResetCodeDocument>('PasswordResetCodes')
        .findOne({
          email: normalizedEmail,
          code: normalizedCode,
          used: false,
          expiresAt: { $gt: new Date() },
        });

      if (resetCodeDoc === null) {
        res.status(400).json({ message: 'Código inválido o expirado.' });
        return;
      }

      res.json({ message: 'Código válido.', valid: true });
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint para resetear contraseña
authRouter.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code, newPassword } = req.body ?? {};

      if (typeof email !== 'string' || email.trim() === '') {
        res.status(400).json({ message: 'Email requerido.' });
        return;
      }

      if (typeof code !== 'string' || code.trim() === '') {
        res.status(400).json({ message: 'Código requerido.' });
        return;
      }

      if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedCode = code.trim();

      const db = await connectToDatabase();

      // Verificar código
      const resetCodeDoc = await db.collection<PasswordResetCodeDocument>('PasswordResetCodes')
        .findOne({
          email: normalizedEmail,
          code: normalizedCode,
          used: false,
          expiresAt: { $gt: new Date() },
        });

      if (resetCodeDoc === null) {
        res.status(400).json({ message: 'Código inválido o expirado.' });
        return;
      }

      // Verificar que el usuario existe
      const user = await db.collection<UserDocument>('Usuarios').findOne({ 
        email: normalizedEmail,
        rol: 'cliente'
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
      await db.collection<PasswordResetCodeDocument>('PasswordResetCodes').updateOne(
        { _id: resetCodeDoc._id },
        { $set: { used: true } }
      );

      // Eliminar otros códigos no usados del mismo email
      await db.collection<PasswordResetCodeDocument>('PasswordResetCodes').deleteMany({
        email: normalizedEmail,
        used: false,
        _id: { $ne: resetCodeDoc._id },
      });

      res.json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
      next(error);
    }
  }
);

export { authRouter };

