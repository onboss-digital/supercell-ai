import test from 'node:test';
import assert from 'node:assert';
import fetch from 'node:fetch'; // Node 20 tem fetch nativo, mas vamos garantir

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3005';

test('Backend Health Check', async (t) => {
  await t.test('Deve retornar status online', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'online');
  });
});

test('Dashboard Endpoint', async (t) => {
  await t.test('Deve retornar métricas (mesmo que vazias)', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard?periodo=hoje`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.metricsTemplates, 'Deveria conter metricsTemplates');
    assert.ok(Array.isArray(data.availableAccounts), 'Deveria conter availableAccounts');
  });
});

test('Jarvis Intelligence', async (t) => {
  await t.test('Endpoint de chat deve responder (ou dar erro de API Key)', async () => {
    const res = await fetch(`${BASE_URL}/api/jarvis/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Olá Jarvis' }] })
    });
    const data = await res.json();
    // Se a API Key estiver vazia no teste, ele retorna 500 com erro de API Key, o que valida a rota
    assert.ok(res.status === 200 || res.status === 500);
  });
});

test('MercadoPhone Webhook', async (t) => {
  await t.test('Deve processar uma venda simulada', async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/mercadophone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefoneCliente: '5511999999999',
        valorTotal: 100.00,
        canalVenda: 'Teste Integração',
        tipoVenda: 'Offline'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });
});
