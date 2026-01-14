import type { NextFunction, Request, Response } from 'express';
import {
  verifyAdminToken,
  verifyUserToken,
  type AdminTokenPayload,
  type UserTokenPayload,
} from '../utils/jwt.js';

export type AuthenticatedAdmin = AdminTokenPayload;

export interface AdminRequest extends Request {
  admin?: AuthenticatedAdmin;
}

export type AuthenticatedUser = UserTokenPayload;

export interface UserRequest extends Request {
  user?: AuthenticatedUser;
}

function extractTokenFromHeader(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || token === undefined) {
    return null;
  }

  return token;
}

export function requireAdminAuth(req: AdminRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.header('authorization'));

    if (token === null) {
      res.status(401).json({ message: 'Autenticación requerida.' });
      return;
    }

    const payload = verifyAdminToken(token);

    if (payload.role !== 'admin') {
      res.status(403).json({ message: 'Permisos insuficientes.' });
      return;
    }

    req.admin = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

export function requireUserAuth(req: UserRequest, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.header('authorization'));

    if (token === null) {
      res.status(401).json({ message: 'Autenticación requerida.' });
      return;
    }

    const payload = verifyUserToken(token);

    if (payload.role !== 'cliente') {
      res.status(403).json({ message: 'Permisos insuficientes.' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}


