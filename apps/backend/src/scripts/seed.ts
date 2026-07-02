import 'dotenv/config';
import { connectDb } from '../db/connect.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/auth.service.js';

const seedUsers = [
  {
    email: 'admin@noxus.dev',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin' as const,
    status: 'active' as const,
  },
  {
    email: 'ana.silva@noxus.dev',
    password: 'ana123',
    name: 'Ana Silva',
    role: 'employee' as const,
    status: 'active' as const,
    department: 'Comercial',
    phone: '11 98765-4321',
  },
  {
    email: 'carlos.mendes@noxus.dev',
    password: 'carlos123',
    name: 'Carlos Mendes',
    role: 'employee' as const,
    status: 'active' as const,
    department: 'TI',
    phone: '11 97654-3210',
  },
  {
    email: 'maria.oliveira@noxus.dev',
    password: 'maria123',
    name: 'Maria Oliveira',
    role: 'admin' as const,
    status: 'active' as const,
    department: 'RH',
    phone: '11 96543-2109',
  },
  {
    email: 'joao.santos@noxus.dev',
    password: 'joao123',
    name: 'João Santos',
    role: 'employee' as const,
    status: 'inactive' as const,
    department: 'Suporte',
  },
];

async function seed() {
  await connectDb();

  for (const user of seedUsers) {
    const passwordHash = await hashPassword(user.password);

    await User.findOneAndUpdate(
      { email: user.email },
      {
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
        status: user.status,
        department: user.department,
        phone: user.phone,
      },
      { upsert: true, new: true },
    );

    console.log(`Seeded: ${user.email}`);
  }

  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
