import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(DEFAULT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  if (plainPassword.trim() === '' || passwordHash.trim() === '') {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}






