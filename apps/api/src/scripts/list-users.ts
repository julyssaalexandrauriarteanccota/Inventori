import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { PrismaService } from '../database/prisma.service';

async function main() {
  console.log('Querying users from database...');
  const prisma = new PrismaService();
  await prisma.$connect();

  const users = await prisma.usuario.findMany({
    select: {
      id: true,
      email: true,
      nombre: true,
      apellido: true,
      rol: true,
      mustChangePassword: true,
      activo: true,
    },
  });

  console.log('Registered Users:');
  console.log(JSON.stringify(users, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
