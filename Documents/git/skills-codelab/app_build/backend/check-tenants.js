const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function checkTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { config: true }
    });
    
    if (tenants.length === 0) {
      console.log('No hay tenants. Creando uno de prueba...');
      const rawKey = 'rmk_test_validation_key_2026';
      const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
      
      const newTenant = await prisma.tenant.create({
        data: {
          mandante_code: 'TEST',
          proyecto_code: 'VAL',
          nombre: 'Tenant de Validación',
          config: {
            create: {
              api_key_hash: hash,
              llm_provider: 'openai',
              llm_model: 'gpt-4o-mini'
            }
          }
        }
      });
      console.log('Tenant de prueba creado:');
      console.log(`- ID: ${newTenant.id}`);
      console.log(`- API Key: ${rawKey}`);
    } else {
      console.log('Tenants encontrados:');
      tenants.forEach(t => {
        console.log(`- ${t.nombre} (${t.id})`);
      });
    }
  } catch (err) {
    console.error('Error al conectar con la BD:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
