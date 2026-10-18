// Idempotente: roda a cada publicação. Cria o admin inicial e o cardápio/bairros de exemplo
// só quando ainda não existem; depois tudo é editado pelo painel.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATALOG = [
  {
    category: 'Chopp',
    products: [
      { name: 'Chopp Pilsen 30 L', unit: 'barril 30 L', priceCents: 42000, stock: 10, featured: true, description: 'Leve e refrescante. Acompanha chopeira e cilindro de CO₂ em comodato.' },
      { name: 'Chopp Pilsen 50 L', unit: 'barril 50 L', priceCents: 65000, stock: 6, description: 'Ideal para festas maiores. Acompanha chopeira e CO₂.' },
      { name: 'Chopp Escuro 30 L', unit: 'barril 30 L', priceCents: 52000, stock: 4, description: 'Maltado, com notas de café e caramelo.' },
    ],
  },
  {
    category: 'Equipamentos',
    products: [
      { name: 'Chopeira elétrica extra', unit: 'diária', priceCents: 8000, stock: 3, description: 'Para servir dois barris ao mesmo tempo.' },
      { name: 'Copos descartáveis 300 ml', unit: 'pacote c/ 100', priceCents: 2500, stock: null, description: '' },
    ],
  },
  {
    category: 'Acompanhamentos',
    products: [{ name: 'Gelo em cubos 10 kg', unit: 'saco', priceCents: 1800, stock: null, description: '' }],
  },
];

const ZONES = [
  { name: 'Centro', feeCents: 0 },
  { name: 'Bairro vizinho', feeCents: 1500 },
  { name: 'Outros bairros', feeCents: 3000 },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';
  if (!password) throw new Error('SEED_ADMIN_PASSWORD não definido');

  if ((await prisma.user.count({ where: { role: 'admin' } })) === 0) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'admin' },
      create: { email, name, role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Admin criado: ${email}`);
  }

  if ((await prisma.product.count()) === 0 && (await prisma.category.count()) === 0) {
    for (const [ci, c] of CATALOG.entries()) {
      const cat = await prisma.category.create({ data: { name: c.category, sortOrder: ci } });
      for (const [pi, p] of c.products.entries()) await prisma.product.create({ data: { ...p, categoryId: cat.id, sortOrder: pi } });
    }
    console.log('Cardápio inicial criado');
  }

  if ((await prisma.deliveryZone.count()) === 0) {
    for (const [i, z] of ZONES.entries()) await prisma.deliveryZone.create({ data: { ...z, sortOrder: i } });
    console.log('Bairros iniciais criados');
  }

  await prisma.setting.upsert({ where: { key: 'storeName' }, update: {}, create: { key: 'storeName', value: "Erasmo Chopp" } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
