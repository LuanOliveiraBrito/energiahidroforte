const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário administrador
  const senhaHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hidroforte.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@hidroforte.com.br',
      senha: senhaHash,
      role: 'ADMINISTRADOR',
    },
  });

  const administrativo = await prisma.user.upsert({
    where: { email: 'administrativo@hidroforte.com.br' },
    update: {},
    create: {
      nome: 'Administrativo',
      email: 'administrativo@hidroforte.com.br',
      senha: senhaHash,
      role: 'ADMINISTRATIVO',
    },
  });

  const gerenteAdm = await prisma.user.upsert({
    where: { email: 'gerente@hidroforte.com.br' },
    update: {},
    create: {
      nome: 'Gerente ADM',
      email: 'gerente@hidroforte.com.br',
      senha: senhaHash,
      role: 'GERENTE_ADM',
    },
  });

  const diretor = await prisma.user.upsert({
    where: { email: 'diretor@hidroforte.com.br' },
    update: {},
    create: {
      nome: 'Diretor',
      email: 'diretor@hidroforte.com.br',
      senha: senhaHash,
      role: 'DIRETOR',
    },
  });

  const financeiro = await prisma.user.upsert({
    where: { email: 'financeiro@hidroforte.com.br' },
    update: {},
    create: {
      nome: 'Financeiro',
      email: 'financeiro@hidroforte.com.br',
      senha: senhaHash,
      role: 'FINANCEIRO',
    },
  });

  // Naturezas padrão
  const naturezas = ['Energia', 'Água', 'Aluguel', 'Telefonia', 'Internet'];
  for (const desc of naturezas) {
    await prisma.natureza.upsert({
      where: { descricao: desc },
      update: {},
      create: { descricao: desc },
    });
  }

  console.log('✅ Seed concluído!');
  console.log('');
  console.log('👤 Usuários criados:');
  console.log(`   Admin:          admin@hidroforte.com.br / admin123`);
  console.log(`   Administrativo: administrativo@hidroforte.com.br / admin123`);
  console.log(`   Gerente ADM:    gerente@hidroforte.com.br / admin123`);
  console.log(`   Diretor:        diretor@hidroforte.com.br / admin123`);
  console.log(`   Financeiro:     financeiro@hidroforte.com.br / admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
