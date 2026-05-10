import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

async function testProfile() {
  console.log('--- TESTE PERFIL EMPRESA (Z-API) ---');
  try {
    console.log('Tentando buscar foto da própria instância...');
    const photoRes = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/profile-picture`, {
      headers: { 'Client-Token': zapiClientToken }
    });
    const photoData = await photoRes.json();
    console.log('Dados Foto (Sem Telefone):', photoData);

    const meRes = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/me`, {
      headers: { 'Client-Token': zapiClientToken }
    });
    const meData = await meRes.json();
    console.log('Dados Me Completos:', meData);
    process.exit(0);
  } catch (e) {
    console.error('Erro no teste:', e.message);
    process.exit(1);
  }
}

testProfile();
