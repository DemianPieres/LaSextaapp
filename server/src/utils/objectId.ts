import { ObjectId } from 'mongodb';

export function parseObjectId(id: string, field: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    const error = new Error(`El identificador proporcionado en ${field} no es válido.`);
    (error as any).status = 400;
    throw error;
  }
  return new ObjectId(id);
}







