import dotenv from 'dotenv';
dotenv.config();

async function testZAPI() {
    // Usando global fetch do Node 18+
    const id = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
    const token = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
    
    console.log('--- TESTE DE DIAGNÓSTICO Z-API ---');
    console.log(`ID: [${id}] (tamanho: ${id.length})`);
    console.log(`Token: [${token}] (tamanho: ${token.length})`);
    
    const url = `https://api.z-api.io/instances/${id}/token/${token}/status`;
    console.log(`Chamando: ${url}`);
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log('RESPOSTA DA Z-API:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.log('ERRO NA CHAMADA:', err.message);
    }
}

testZAPI();
