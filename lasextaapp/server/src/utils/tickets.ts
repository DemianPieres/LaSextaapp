import crypto from 'node:crypto';

const DEFAULT_EXPIRATION_DAYS = 7;

export function generateTicketCode(): string {
  const randomBytes = crypto.randomBytes(6).toString('base64url').toUpperCase();
  const segmented = randomBytes.match(/.{1,4}/g)?.join('-') ?? randomBytes;
  return `QR-${segmented}`;
}

export function computeExpirationDate(days: number = DEFAULT_EXPIRATION_DAYS): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}







