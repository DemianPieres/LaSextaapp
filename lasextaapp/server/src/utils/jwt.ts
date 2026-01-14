import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

if (jwtSecret === undefined || jwtSecret.trim() === '') {
  console.warn('[auth] La variable JWT_SECRET no está definida. Configúrala para habilitar el modo administrador.');
}

export type BaseTokenPayload = {
  userId: string;
  email: string;
  role: 'admin' | 'cliente';
};

export type AdminTokenPayload = BaseTokenPayload & {
  role: 'admin';
};

export type UserTokenPayload = BaseTokenPayload & {
  role: 'cliente';
};

const DEFAULT_EXPIRATION = '8h';

function ensureSecret(): string {
  if (jwtSecret === undefined || jwtSecret.trim() === '') {
    throw new Error('No se puede firmar/verificar el token: JWT_SECRET no está configurado.');
  }

  return jwtSecret;
}

function signToken<TPayload extends BaseTokenPayload>(payload: TPayload, expiresIn: string = DEFAULT_EXPIRATION): string {
  const secret = ensureSecret();
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, secret as Secret, options);
}

export function signAdminToken(payload: AdminTokenPayload, expiresIn: string = DEFAULT_EXPIRATION): string {
  return signToken(payload, expiresIn);
}

export function signUserToken(payload: UserTokenPayload, expiresIn: string = DEFAULT_EXPIRATION): string {
  return signToken(payload, expiresIn);
}

function verifyToken<TPayload extends BaseTokenPayload>(token: string): TPayload {
  const secret = ensureSecret();
  const decoded = jwt.verify(token, secret as Secret);
  return decoded as TPayload;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const payload = verifyToken<AdminTokenPayload>(token);
  if (payload.role !== 'admin') {
    throw new Error('El token no corresponde a un administrador.');
  }
  return payload;
}

export function verifyUserToken(token: string): UserTokenPayload {
  const payload = verifyToken<UserTokenPayload>(token);
  if (payload.role !== 'cliente') {
    throw new Error('El token no corresponde a un usuario cliente.');
  }
  return payload;
}
