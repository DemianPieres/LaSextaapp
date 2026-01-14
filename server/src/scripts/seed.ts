import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectToDatabase, disconnectFromDatabase } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { generateTicketCode, computeExpirationDate } from '../utils/tickets.js';

type UserDocument = {
  _id: ObjectId;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'cliente';
  fechaRegistro: Date;
};

type TicketDocument = {
  _id: ObjectId;
  usuarioId: ObjectId;
  codigoQR: string;
  estado: 'valido' | 'usado' | 'expirado';
  fechaCreacion: Date;
  fechaVencimiento?: Date;
  emitidoPor?: ObjectId;
};

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Administrador';

const DEFAULT_CLIENT_EMAIL = process.env.SEED_CLIENT_EMAIL ?? 'cliente-demo@example.com';
const DEFAULT_CLIENT_PASSWORD = process.env.SEED_CLIENT_PASSWORD ?? 'Demo123!';
const DEFAULT_CLIENT_NAME = process.env.SEED_CLIENT_NAME ?? 'Cliente Demo';

async function ensureIndexes(): Promise<void> {
  const db = await connectToDatabase();
  await Promise.all([
    db.collection<UserDocument>('Usuarios').createIndex({ email: 1 }, { unique: true }),
    db.collection<TicketDocument>('Tickets').createIndex({ usuarioId: 1 }),
    db.collection<TicketDocument>('Tickets').createIndex({ estado: 1 }),
  ]);
}

async function ensureUser(params: {
  email: string;
  nombre: string;
  password: string;
  rol: 'admin' | 'cliente';
}): Promise<UserDocument> {
  const db = await connectToDatabase();
  const collection = db.collection<UserDocument>('Usuarios');

  const existingUser = await collection.findOne({ email: params.email.toLowerCase() });
  if (existingUser !== null) {
    return existingUser;
  }

  const passwordHash = await hashPassword(params.password);
  const now = new Date();
  const newUser: UserDocument = {
    _id: new ObjectId(),
    nombre: params.nombre,
    email: params.email.toLowerCase(),
    passwordHash,
    rol: params.rol,
    fechaRegistro: now,
  };

  await collection.insertOne(newUser);
  console.info(`[seed] Usuario ${params.rol} creado (${params.email})`);

  return newUser;
}

async function ensureSampleTicket(usuarioId: ObjectId, emitidoPor?: ObjectId): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection<TicketDocument>('Tickets');

  const existingActive = await collection.findOne({ usuarioId, estado: 'valido' });
  if (existingActive !== null) {
    console.info(`[seed] El usuario ${usuarioId.toHexString()} ya posee un ticket válido.`);
    return;
  }

  const ticket: TicketDocument = {
    _id: new ObjectId(),
    usuarioId,
    codigoQR: generateTicketCode(),
    estado: 'valido',
    fechaCreacion: new Date(),
    fechaVencimiento: computeExpirationDate(7),
    emitidoPor,
  };

  await collection.insertOne(ticket);
  console.info(`[seed] Ticket de cortesía creado para el usuario ${usuarioId.toHexString()}.`);
}

async function runSeed(): Promise<void> {
  try {
    await ensureIndexes();

    const admin = await ensureUser({
      email: DEFAULT_ADMIN_EMAIL,
      nombre: DEFAULT_ADMIN_NAME,
      password: DEFAULT_ADMIN_PASSWORD,
      rol: 'admin',
    });

    const client = await ensureUser({
      email: DEFAULT_CLIENT_EMAIL,
      nombre: DEFAULT_CLIENT_NAME,
      password: DEFAULT_CLIENT_PASSWORD,
      rol: 'cliente',
    });

    await ensureSampleTicket(client._id, admin._id);

    console.info('[seed] Proceso finalizado correctamente.');
  } catch (error) {
    console.error('[seed] Error durante el seed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectFromDatabase();
  }
}

void runSeed();


