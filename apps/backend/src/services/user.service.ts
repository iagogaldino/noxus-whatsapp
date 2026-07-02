import { Types } from 'mongoose';
import { Sector } from '../models/Sector.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/error.middleware.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';

export interface UserDto {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  department?: string;
  sectorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  phone: string;
  name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  sectorId?: string | null;
  department?: string;
}

function toDto(doc: {
  _id: Types.ObjectId;
  phone: string;
  name: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  department?: string | null;
  sectorId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}): UserDto {
  return {
    id: String(doc._id),
    phone: doc.phone ?? '',
    name: doc.name,
    role: doc.role,
    status: doc.status,
    department: doc.department ?? undefined,
    sectorId: doc.sectorId ? String(doc.sectorId) : null,
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function resolveSectorId(
  sectorId?: string | null,
  department?: string,
): Promise<{ sectorId: Types.ObjectId | null; department?: string }> {
  if (sectorId) {
    if (!Types.ObjectId.isValid(sectorId)) {
      throw new AppError(400, 'Setor inválido.');
    }
    const sector = await Sector.findById(sectorId).lean();
    if (!sector) {
      throw new AppError(400, 'Setor não encontrado.');
    }
    return { sectorId: new Types.ObjectId(sectorId), department: sector.name };
  }

  if (department?.trim()) {
    const sector = await Sector.findOne({ name: department.trim() }).lean();
    return {
      sectorId: sector ? new Types.ObjectId(String(sector._id)) : null,
      department: department.trim(),
    };
  }

  return { sectorId: null };
}

export async function listUsers(): Promise<UserDto[]> {
  const docs = await User.find().sort({ name: 1 }).lean();
  return docs.map((doc) => toDto(doc));
}

export async function getUserById(id: string): Promise<UserDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de usuário inválido.');
  }

  const doc = await User.findById(id).lean();
  if (!doc) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return toDto(doc);
}

export async function createUser(input: UserInput): Promise<UserDto> {
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) {
    throw new AppError(400, 'Informe um telefone válido com DDD.');
  }

  const existing = await User.findOne({ phone }).lean();
  if (existing) {
    throw new AppError(409, 'Já existe um usuário com este telefone.');
  }

  const sector = await resolveSectorId(input.sectorId, input.department);

  const doc = await User.create({
    phone,
    name: input.name.trim(),
    role: input.role,
    status: input.status,
    sectorId: sector.sectorId,
    department: sector.department,
  });

  return toDto(doc);
}

export async function updateUser(id: string, input: Partial<UserInput>): Promise<UserDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de usuário inválido.');
  }

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }
  if (input.role !== undefined) {
    updates.role = input.role;
  }
  if (input.status !== undefined) {
    updates.status = input.status;
  }

  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);
    if (!isValidPhone(phone)) {
      throw new AppError(400, 'Informe um telefone válido com DDD.');
    }
    const duplicate = await User.findOne({ phone, _id: { $ne: id } }).lean();
    if (duplicate) {
      throw new AppError(409, 'Já existe um usuário com este telefone.');
    }
    updates.phone = phone;
  }

  if (input.sectorId !== undefined || input.department !== undefined) {
    const sector = await resolveSectorId(input.sectorId, input.department);
    updates.sectorId = sector.sectorId;
    updates.department = sector.department;
  }

  const doc = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!doc) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return toDto(doc);
}

export async function deleteUser(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'ID de usuário inválido.');
  }

  const user = await User.findById(id).lean();
  if (!user) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  if (user.role === 'admin' && user.status === 'active') {
    const activeAdmins = await User.countDocuments({ role: 'admin', status: 'active' });
    if (activeAdmins <= 1) {
      throw new AppError(409, 'Não é possível remover o último administrador ativo.');
    }
  }

  const result = await User.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(404, 'Usuário não encontrado.');
  }
}
