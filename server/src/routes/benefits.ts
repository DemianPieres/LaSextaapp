import { Router, type NextFunction, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../config/database.js';
import { requireAdminAuth, type AdminRequest } from '../middleware/auth.js';
import { parseObjectId } from '../utils/objectId.js';

export type BenefitDocument = {
  _id: ObjectId;
  titulo: string;
  descripcionCorta: string;
  descripcionCompleta: string;
  logoUrl: string;
  nombreAuspiciante: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BenefitResponse = {
  id: string;
  titulo: string;
  descripcionCorta: string;
  descripcionCompleta: string;
  logoUrl: string;
  nombreAuspiciante: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION_NAME = 'Benefits';

function sanitizeBenefit(document: BenefitDocument): BenefitResponse {
  return {
    id: document._id.toHexString(),
    titulo: document.titulo,
    descripcionCorta: document.descripcionCorta,
    descripcionCompleta: document.descripcionCompleta,
    logoUrl: document.logoUrl,
    nombreAuspiciante: document.nombreAuspiciante,
    activo: document.activo,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function validateStringField(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`El campo ${fieldName} es obligatorio.`), { status: 400 });
  }
  return value.trim();
}

// ===== ROUTER PÚBLICO =====
const benefitsRouter = Router();

benefitsRouter.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const benefits = await db
        .collection<BenefitDocument>(COLLECTION_NAME)
        .find({ activo: true })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        benefits: benefits.map(sanitizeBenefit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== ROUTER ADMIN =====
const adminBenefitsRouter = Router();

adminBenefitsRouter.use(requireAdminAuth);

adminBenefitsRouter.get(
  '/',
  async (_req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const db = await connectToDatabase();
      const benefits = await db
        .collection<BenefitDocument>(COLLECTION_NAME)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ benefits: benefits.map(sanitizeBenefit) });
    } catch (error) {
      next(error);
    }
  }
);

adminBenefitsRouter.post(
  '/',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const { titulo, descripcionCorta, descripcionCompleta, logoUrl, nombreAuspiciante, activo } = req.body ?? {};

      const newBenefit: BenefitDocument = {
        _id: new ObjectId(),
        titulo: validateStringField(titulo, 'titulo'),
        descripcionCorta: validateStringField(descripcionCorta, 'descripcionCorta'),
        descripcionCompleta: validateStringField(descripcionCompleta, 'descripcionCompleta'),
        logoUrl: validateStringField(logoUrl, 'logoUrl'),
        nombreAuspiciante: validateStringField(nombreAuspiciante, 'nombreAuspiciante'),
        activo: activo === false ? false : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = await connectToDatabase();
      await db.collection<BenefitDocument>(COLLECTION_NAME).insertOne(newBenefit);

      const benefitResponse = sanitizeBenefit(newBenefit);

      res.status(201).json({ benefit: benefitResponse });
    } catch (error) {
      next(error);
    }
  }
);

adminBenefitsRouter.put(
  '/:benefitId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const benefitId = parseObjectId(req.params.benefitId, 'benefitId');
      const { titulo, descripcionCorta, descripcionCompleta, logoUrl, nombreAuspiciante, activo } = req.body ?? {};

      const update: Partial<BenefitDocument> = {
        updatedAt: new Date(),
      };

      if (titulo !== undefined) {
        update.titulo = validateStringField(titulo, 'titulo');
      }
      if (descripcionCorta !== undefined) {
        update.descripcionCorta = validateStringField(descripcionCorta, 'descripcionCorta');
      }
      if (descripcionCompleta !== undefined) {
        update.descripcionCompleta = validateStringField(descripcionCompleta, 'descripcionCompleta');
      }
      if (logoUrl !== undefined) {
        update.logoUrl = validateStringField(logoUrl, 'logoUrl');
      }
      if (nombreAuspiciante !== undefined) {
        update.nombreAuspiciante = validateStringField(nombreAuspiciante, 'nombreAuspiciante');
      }
      if (activo !== undefined) {
        update.activo = Boolean(activo);
      }

      const db = await connectToDatabase();
      const result = await db
        .collection<BenefitDocument>(COLLECTION_NAME)
        .findOneAndUpdate({ _id: benefitId }, { $set: update }, { returnDocument: 'after' });

      const updatedBenefit = result.value ?? null;

      if (updatedBenefit === null) {
        res.status(404).json({ message: 'Beneficio no encontrado.' });
        return;
      }

      const benefitResponse = sanitizeBenefit(updatedBenefit);

      res.json({ benefit: benefitResponse });
    } catch (error) {
      next(error);
    }
  }
);

adminBenefitsRouter.delete(
  '/:benefitId',
  async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const benefitId = parseObjectId(req.params.benefitId, 'benefitId');

      const db = await connectToDatabase();
      const result = await db.collection<BenefitDocument>(COLLECTION_NAME).deleteOne({ _id: benefitId });

      if (result.deletedCount === 0) {
        res.status(404).json({ message: 'Beneficio no encontrado.' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export { adminBenefitsRouter, benefitsRouter, sanitizeBenefit };

