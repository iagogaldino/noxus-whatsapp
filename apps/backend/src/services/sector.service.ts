import { Types } from 'mongoose';
import { ChatConversation } from '../models/ChatConversation.js';
import { Sector } from '../models/Sector.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';

export interface SectorDto {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function toDto(doc: {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}): SectorDto {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description ?? '',
    status: doc.status,
    isDefault: doc.isDefault ?? false,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function getDefaultSector(): Promise<{ id: string; objectId: Types.ObjectId; name: string }> {
  const doc = await Sector.findOne({ isDefault: true, status: 'active' }).lean();
  if (!doc) {
    throw new AppError(500, 'Setor padrão não configurado.');
  }

  return {
    id: String(doc._id),
    objectId: doc._id as Types.ObjectId,
    name: doc.name,
  };
}

async function assertNotDefaultSector(id: string, action: string): Promise<void> {
  const doc = await Sector.findById(id).select('isDefault').lean();
  if (doc?.isDefault) {
    throw new AppError(409, `Não é possível ${action} o setor padrão.`);
  }
}

export async function listSectors(options: { includeInactive?: boolean } = {}): Promise<SectorDto[]> {
  const filter = options.includeInactive ? {} : { status: 'active' as const };
  const docs = await Sector.find(filter).sort({ isDefault: -1, name: 1 }).lean();
  return docs.map((doc) => toDto(doc));
}

export async function getSectorById(id: string): Promise<SectorDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de setor inválido.');
  }

  const doc = await Sector.findById(id).lean();
  if (!doc) {
    throw new AppError(404, 'Setor não encontrado.');
  }

  return toDto(doc);
}

export async function createSector(input: {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}): Promise<SectorDto> {
  const name = input.name.trim();
  const existing = await Sector.findOne({ name }).lean();
  if (existing) {
    throw new AppError(409, 'Já existe um setor com este nome.');
  }

  const doc = await Sector.create({
    name,
    description: input.description?.trim() ?? '',
    status: input.status ?? 'active',
    isDefault: false,
  });

  return toDto(doc);
}

export async function updateSector(
  id: string,
  input: {
    name?: string;
    description?: string;
    status?: 'active' | 'inactive';
  },
): Promise<SectorDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de setor inválido.');
  }

  const current = await Sector.findById(id).lean();
  if (!current) {
    throw new AppError(404, 'Setor não encontrado.');
  }

  if (current.isDefault && input.status === 'inactive') {
    throw new AppError(409, 'Não é possível inativar o setor padrão.');
  }

  if (input.name) {
    const name = input.name.trim();
    const duplicate = await Sector.findOne({ name, _id: { $ne: id } }).lean();
    if (duplicate) {
      throw new AppError(409, 'Já existe um setor com este nome.');
    }
  }

  const doc = await Sector.findByIdAndUpdate(
    id,
    {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    { new: true, runValidators: true },
  ).lean();

  if (!doc) {
    throw new AppError(404, 'Setor não encontrado.');
  }

  return toDto(doc);
}

export async function deleteSector(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de setor inválido.');
  }

  await assertNotDefaultSector(id, 'excluir');

  const sectorObjectId = new Types.ObjectId(id);

  const [conversationCount, userCount] = await Promise.all([
    ChatConversation.countDocuments({ assignedSectorId: sectorObjectId }),
    User.countDocuments({ sectorId: sectorObjectId }),
  ]);

  if (conversationCount > 0 || userCount > 0) {
    throw new AppError(
      409,
      'Não é possível excluir um setor vinculado a conversas ou funcionários.',
    );
  }

  const result = await Sector.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(404, 'Setor não encontrado.');
  }
}

export async function getActiveSectorById(id: string): Promise<SectorDto> {
  const sector = await getSectorById(id);
  if (sector.status !== 'active') {
    throw new AppError(400, 'Setor inativo.');
  }
  return sector;
}
