import dotenv from 'dotenv';
dotenv.config();

const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

async function deepSearch() {
  console.log('--- BUSCA PROFUNDA DE DADOS (Z-API) ---');
  try {
    const urls = [
      `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/me`,
      `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/status`
    ];

    for (const url of urls) {
      console.log(`\nTestando URL: ${url}`);
      const res = await fetch(url, { headers: { 'Client-Token': zapiClientToken } });
      const data = await res.json();
      console.log('Dados recebidos:', JSON.stringify(data, null, 2));
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}

deepSearch();
