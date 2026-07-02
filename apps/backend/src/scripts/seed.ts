import 'dotenv/config';
import { connectDb } from '../db/connect.js';
import { Sector } from '../models/Sector.js';
import { User } from '../models/User.js';
import { normalizePhone } from '../utils/phone.js';

const seedSectors = [
  { name: 'Comercial', description: 'Vendas e atendimento comercial' },
  { name: 'TI', description: 'Tecnologia da informação' },
  { name: 'RH', description: 'Recursos humanos' },
  { name: 'Suporte', description: 'Suporte ao cliente' },
];

const seedUsers = [
  {
    phone: '5574988420307',
    name: 'Administrador',
    role: 'admin' as const,
    status: 'active' as const,
  },
  {
    phone: '5511999990001',
    name: 'Administrador',
    role: 'admin' as const,
    status: 'active' as const,
  },
  {
    phone: '5511987654321',
    name: 'Ana Silva',
    role: 'employee' as const,
    status: 'active' as const,
    sectorName: 'Comercial',
  },
  {
    phone: '5511976543210',
    name: 'Carlos Mendes',
    role: 'employee' as const,
    status: 'active' as const,
    sectorName: 'TI',
  },
  {
    phone: '5511965432109',
    name: 'Maria Oliveira',
    role: 'admin' as const,
    status: 'active' as const,
    sectorName: 'RH',
  },
  {
    phone: '5511954321098',
    name: 'João Santos',
    role: 'employee' as const,
    status: 'inactive' as const,
    sectorName: 'Suporte',
  },
];

async function seed() {
  await connectDb();

  const sectorIds = new Map<string, string>();

  for (const sector of seedSectors) {
    const doc = await Sector.findOneAndUpdate(
      { name: sector.name },
      {
        name: sector.name,
        description: sector.description,
        status: 'active',
      },
      { upsert: true, new: true },
    );

    sectorIds.set(sector.name, String(doc._id));
    console.log(`Seeded sector: ${sector.name}`);
  }

  for (const user of seedUsers) {
    const phone = normalizePhone(user.phone);
    const sectorId = user.sectorName ? sectorIds.get(user.sectorName) : undefined;

    await User.findOneAndUpdate(
      { phone },
      {
        phone,
        name: user.name,
        role: user.role,
        status: user.status,
        department: user.sectorName,
        sectorId: sectorId ?? null,
      },
      { upsert: true, new: true },
    );

    console.log(`Seeded: ${user.name} (${phone})`);
  }

  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
