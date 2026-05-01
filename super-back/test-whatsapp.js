const mockWAPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "5511999999999",
              phone_number_id: "1234567890"
            },
            contacts: [
              {
                profile: { name: "Luiz Teste Antigravity" },
                wa_id: "5511988887777"
              }
            ],
            messages: [
              {
                from: "5511988887777",
                id: "wamid.HBgLNTUxMTk4ODg4Nzc3NxUCABIYFjNFQzY2OUE5QjY3RTBDRjREOEI0MDUA",
                timestamp: Math.floor(Date.now() / 1000),
                text: { body: "Olá! Gostaria de mais informações sobre o SupercellAI." },
                type: "text",
                referral: {
                  source_id: "1202061234567890", // Simulando vindo de um anúncio
                  source_type: "ad",
                  source_url: "https://fb.me/...",
                  headline: "Oferta Exclusiva Supercell",
                  body: "Clique aqui para falar conosco"
                }
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

console.log('🚀 Enviando simulação de Lead do WhatsApp para o Webhook...');

try {
  const response = await fetch('http://localhost:3005/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockWAPayload)
  });

  if (response.ok) {
    console.log('✅ Webhook do WhatsApp recebido com sucesso!');
    console.log('👉 Verifique o console do backend e o seu CRM.');
  } else {
    console.log('❌ Erro ao enviar para o webhook:', response.status);
  }
} catch (err) {
  console.error('❌ Falha na conexão:', err);
}
