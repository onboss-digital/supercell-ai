import dotenv from 'dotenv';

dotenv.config();

async function testBIControllers() {
  const API_URL = process.env.MERCADOPHONE_API_URL;
  const TOKEN = process.env.MERCADOPHONE_API_TOKEN;

  if (!API_URL || !TOKEN) {
    console.error('Configurações ausentes');
    return;
  }

  const controllers = [
    'DashboardApiController',
    'RelatoriosApiController',
    'RelatorioApiController',
    'VendasRelatorioApiController',
    'EstatisticasApiController',
    'BIControler',
    'BIApiController',
    'VendaApiController' // já sabemos
  ];

  for (const ctrl of controllers) {
    try {
      const res = await fetch(`${API_URL}?class=${ctrl}&method=index`, {
        method: 'POST',
        headers: {
          'Authorization': TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataInicio: '2026-05-28',
          dataFim: '2026-05-28'
        })
      });

      const data = await res.json().catch(() => null);
      if (data && data.error && data.error.includes('não encontrada')) {
        // não encontrada
      } else {
        console.log(`[ENCONTRADA] ${ctrl} | Status: ${res.status}`);
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log(`Erro ao testar ${ctrl}:`, e.message);
    }
  }
}

testBIControllers();
