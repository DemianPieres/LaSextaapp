import { MongoClient, type Db } from 'mongodb';

const DEFAULT_DB_NAME = 'complejo_futbol_app';

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

const mongodbUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;

if (mongodbUri === undefined || mongodbUri.trim() === '') {
  console.warn(
    '[database] La variable MONGODB_URI no está definida. Asegúrate de configurarla en tu entorno antes de iniciar el servidor.'
  );
}

export async function connectToDatabase(): Promise<Db> {
  if (mongoDb !== null) {
    return mongoDb;
  }

  if (mongodbUri === undefined || mongodbUri.trim() === '') {
    throw new Error('No se puede establecer la conexión a MongoDB: MONGODB_URI es indefinido.');
  }

  mongoClient = new MongoClient(mongodbUri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(dbName);

  console.info(`[database] Conectado a MongoDB (${dbName}).`);

  return mongoDb;
}

export function getDb(): Db {
  if (mongoDb === null) {
    throw new Error('La conexión a la base de datos aún no está inicializada. Llama a connectToDatabase() primero.');
  }

  return mongoDb;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoClient !== null) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    console.info('[database] Conexión a MongoDB cerrada.');
  }
}







