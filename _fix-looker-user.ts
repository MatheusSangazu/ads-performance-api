import 'dotenv/config';
import prisma from './server/src/config/db.js';

try {
  console.log('=== VERIFICANDO USUÁRIOS MYSQL ===\n');
  
  const users = await prisma.$queryRaw`SELECT User, Host FROM mysql.user WHERE User IN ('checkfacil', 'root', 'looker')`;
  console.log('Usuários encontrados:');
  users.forEach(u => console.log(`  - '${u.User}'@'${u.Host}'`));

  console.log('\n=== CRIANDO/AJUSTANDO USUÁRIO checkfacil ===\n');
  
  // Cria usuário com acesso de qualquer host (Looker Studio usa IPs variados do Google)
  await prisma.$executeRawUnsafe(`CREATE USER IF NOT EXISTS 'checkfacil'@'%' IDENTIFIED BY 'Check@2026#Facil'`);
  await prisma.$executeRawUnsafe(`ALTER USER 'checkfacil'@'%' IDENTIFIED BY 'Check@2026#Facil'`);
  
  // Garante acesso apenas de leitura em tudo
  await prisma.$executeRawUnsafe(`GRANT SELECT ON growth_ads_db.* TO 'checkfacil'@'%'`);
  await prisma.$executeRawUnsafe(`FLUSH PRIVILEGES`);
  
  console.log('✅ Usuário checkfacil configurado com SELECT em growth_ads_db');
  
  // Verifica grants
  const grants = await prisma.$queryRawUnsafe(`SHOW GRANTS FOR 'checkfacil'@'%'`);
  console.log('\n=== PERMISSÕES ===');
  grants.forEach(g => console.log(`  ${Object.values(g)[0]}`));

  // Testa se as views são acessíveis
  console.log('\n=== TESTANDO ACESSO AS VIEWS ===');
  const testCount = await prisma.$queryRaw`SELECT COUNT(*) as total FROM vw_metrics_by_ad`;
  console.log(`✅ vw_metrics_by_ad acessível: ${testCount[0].total} registros`);

  console.log('\n✅ TUDO PRONTO!');
  console.log('\n=== DADOS PARA CONECTAR NO LOOKER STUDIO ===');
  console.log('Host: mysql.4growthbr.space');
  console.log('Porta: 3306');
  console.log('Database: growth_ads_db');
  console.log('Usuário: checkfacil');
  console.log('Senha: Check@2026#Facil');
} catch (e) {
  console.error('\n❌ ERRO:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
