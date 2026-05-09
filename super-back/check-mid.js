import dotenv from 'dotenv';
dotenv.config();

const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

async function checkMsgData() {
  const mid = '3EB00ECE5CDBE1F02476CF'; // ID da mensagem "opa" que você enviou
  console.log(`--- ANALISANDO MENSAGEM ${mid} ---`);
  try {
    const url = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/message-data?messageId=${mid}`;
    const res = await fetch(url, { headers: { 'Client-Token': zapiClientToken } });
    const data = await res.json();
    console.log('Dados da Mensagem:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}

checkMsgData();
