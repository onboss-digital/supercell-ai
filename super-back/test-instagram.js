const mockIGPayload = {
  object: "instagram",
  entry: [
    {
      id: "123456789",
      time: Date.now(),
      messaging: [
        {
          sender: { id: "IG_USER_TEST_123" },
          recipient: { id: "PAGE_ID" },
          timestamp: Date.now(),
          message: {
            mid: "mid.12345",
            text: "Olá! Vi seu anúncio no Direct e gostaria de saber sobre o iPhone 15."
          }
        }
      ]
    }
  ]
};

console.log('🚀 Enviando simulação de Lead do Instagram para o Webhook...');

try {
  const response = await fetch('http://localhost:3005/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockIGPayload)
  });

  if (response.ok) {
    console.log('✅ Webhook recebido com sucesso!');
    console.log('👉 Agora atualize seu CRM para ver o novo lead do Instagram.');
  } else {
    console.log('❌ Erro ao enviar para o webhook:', response.status);
  }
} catch (err) {
  console.error('❌ Falha na conexão:', err);
}
