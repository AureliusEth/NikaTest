import { PrismaClient } from './src/generated/prisma/client.js';
const p = new PrismaClient();
await p.user.createMany({
  data: [
    { id: 'U1', email: 'u1@example.com', feeCashbackRate: 0.1 },
    { id: 'U2', email: 'u2@example.com', feeCashbackRate: 0 },
  ],
  skipDuplicates: true,
});
await p['']();
console.log('Seeded U1,U2');
