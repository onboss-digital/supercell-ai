import dotenv from 'dotenv';
dotenv.config();

const META_TOKEN = (process.env.META_ACCESS_TOKEN || '').trim().replace(/^["']|["']$/g, '');

async function testMeta() {
  console.log('--- TESTE PERFIL META ---');
  try {
    const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${META_TOKEN}`);
    const accountsData = await accountsRes.json();
    console.log('Contas encontradas:', JSON.stringify(accountsData, null, 2));
    
    if (accountsData.data && accountsData.data.length > 0) {
      const pageId = accountsData.data[0].id;
      const pageToken = accountsData.data[0].access_token;
      const infoRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name,picture.type(large)&access_token=${pageToken}`);
      const infoData = await infoRes.json();
      console.log('Dados da Página:', infoData);
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}

testMeta();
