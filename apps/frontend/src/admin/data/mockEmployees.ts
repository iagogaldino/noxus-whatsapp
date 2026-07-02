import { Employee } from '../types/employee';

const now = new Date().toISOString();

export const seedEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Ana Silva',
    email: 'ana.silva@noxus.dev',
    phone: '11 98765-4321',
    department: 'Comercial',
    role: 'employee',
    status: 'active',
    password: 'ana123',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'emp-2',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@noxus.dev',
    phone: '11 97654-3210',
    department: 'TI',
    role: 'employee',
    status: 'active',
    password: 'carlos123',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'emp-3',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@noxus.dev',
    phone: '11 96543-2109',
    department: 'RH',
    role: 'admin',
    status: 'active',
    password: 'maria123',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'emp-4',
    name: 'João Santos',
    email: 'joao.santos@noxus.dev',
    department: 'Suporte',
    role: 'employee',
    status: 'inactive',
    password: 'joao123',
    createdAt: now,
    updatedAt: now,
  },
];

export const ADMIN_CREDENTIALS = {
  email: 'admin@noxus.dev',
  password: 'admin123',
};
