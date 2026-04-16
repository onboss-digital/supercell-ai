export const dashboardData = {
  summary: {
    totalSpent: 250.00,
    averageCPA: 8.30,
    totalLeads: 30,
    roas: 4.2
  },
  aiInsights: {
    title: "Insights do Jarvis",
    subtitle: "Análise de IA em tempo real",
    suggestion: "O ROAS caiu 5% hoje, mas a conversão do WhatsApp subiu. Sugestão: testar novo criativo para anúncios de assistência.",
    prioritySuggestions: [
      "Pausar Campanha Y e realocar orçamento para a Campanha Z que possui melhor ROAS.",
      "Fazer follow-up imediato com os 5 leads mais quentes de ontem."
    ],
    status: "Active"
  },
  funnel: {
    projectedLTV: 1200.00,
    conversionSteps: [
      { label: "Tráfego (Impressões)", value: 45000, color: "var(--color-primary)" },
      { label: "Cliques no Link", value: 1200, color: "var(--color-primary-container)" },
      { label: "Checkouts Iniciados", value: 320, color: "var(--color-secondary)" },
      { label: "Leads Gerados", value: 110, color: "var(--color-secondary-container)" },
      { label: "Vendas Finalizadas", value: 12, color: "var(--color-tertiary)" }
    ]
  },
  platforms: [
    { name: "WhatsApp", count: 50, percentage: 45 },
    { name: "Instagram", count: 60, percentage: 55 }
  ]
};

export const campaignsData = [
  {
    id: 'c1',
    name: '[VENDAS] - Produto Alpha - Geral',
    status: 'active',
    budget: 150.00,
    spent: 85.30,
    roas: 5.2,
    cpa: 6.50,
    leads: 13,
    impressions: 12500,
    clicks: 450,
    ctr: 3.6,
    platform: 'Meta',
    adSets: [
      { 
        id: 'as1', campaignId: 'c1', name: 'Público Quente (IG/FB)', status: 'active', budget: 100, spent: 50.30, cpa: 4.50, roas: 6.0, leads: 10, ctr: 4.1, clicks: 300, impressions: 8000,
        ads: [
          { id: 'a1', adSetId: 'as1', name: 'Ad - Vídeo VSL', status: 'active', spent: 30.00, cpa: 4.00, roas: 6.5, leads: 7, ctr: 4.5, clicks: 200, impressions: 5000 },
          { id: 'a2', adSetId: 'as1', name: 'Ad - Imagem Estática', status: 'active', spent: 20.30, cpa: 5.00, roas: 5.0, leads: 3, ctr: 3.5, clicks: 100, impressions: 3000 }
        ]
      },
      { 
        id: 'as2', campaignId: 'c1', name: 'Interesses - Empreendedores', status: 'active', budget: 50, spent: 35.00, cpa: 11.66, roas: 4.0, leads: 3, ctr: 2.5, clicks: 150, impressions: 4500,
        ads: [
          { id: 'a3', adSetId: 'as2', name: 'Ad - Carrossel', status: 'active', spent: 35.00, cpa: 11.66, roas: 4.0, leads: 3, ctr: 2.5, clicks: 150, impressions: 4500 }
        ]
      }
    ]
  },
  {
    id: 'c2',
    name: '[LEADS] - Captura E-book - LAL 1%',
    status: 'active',
    budget: 50.00,
    spent: 45.00,
    roas: 2.1,
    cpa: 3.20,
    leads: 14,
    impressions: 18000,
    clicks: 300,
    ctr: 1.6,
    platform: 'Meta',
    adSets: [
      { 
        id: 'as3', campaignId: 'c2', name: 'Lookalike 1% Compradores', status: 'active', budget: 50, spent: 45.00, cpa: 3.20, roas: 2.1, leads: 14, ctr: 1.6, clicks: 300, impressions: 18000,
        ads: [
          { id: 'a4', adSetId: 'as3', name: 'Ad - Copy Curta', status: 'active', spent: 45.00, cpa: 3.20, roas: 2.1, leads: 14, ctr: 1.6, clicks: 300, impressions: 18000 }
        ]
      }
    ]
  },
  {
    id: 'c3',
    name: '[REMARKETING] - Carrinho Abandonado',
    status: 'paused',
    budget: 20.00,
    spent: 12.00,
    roas: 8.5,
    cpa: 4.00,
    leads: 3,
    impressions: 2500,
    clicks: 120,
    ctr: 4.8,
    platform: 'Meta',
    adSets: [
      { 
        id: 'as4', campaignId: 'c3', name: 'Visitas 7D + ViewContent', status: 'paused', budget: 20, spent: 12.00, cpa: 4.00, roas: 8.5, leads: 3, ctr: 4.8, clicks: 120, impressions: 2500,
        ads: [
          { id: 'a5', adSetId: 'as4', name: 'Ad - Depoimento', status: 'paused', spent: 12.00, cpa: 4.00, roas: 8.5, leads: 3, ctr: 4.8, clicks: 120, impressions: 2500 }
        ]
      }
    ]
  }
];

export const menuItems = [
  { id: 'dashboard', label: 'Dashboard Geral', icon: 'dashboard', path: '/dashboard' },
  { id: 'ads', label: 'Campanhas', icon: 'ads_click', path: '/ads' },
  { id: 'funnel', label: 'Funil de Vendas', icon: 'filter_alt', path: '/funnel' },
  { id: 'crm', label: 'CRM de Leads', icon: 'group', path: '/crm' },
  { id: 'reports', label: 'Relatórios da IA', icon: 'psychology', path: '/reports' },
  { id: 'settings', label: 'Configurações', icon: 'settings', path: '/settings' }
];

export const leadsData = [
  { id: 'l1', name: 'João Silva', source: 'WhatsApp', status: 'Novo', date: '08/04/2026', value: 1200, phone: '(11) 98888-7777', email: 'joao@email.com', product: 'iPhone 13 128GB', temperature: 'Quente' },
  { id: 'l2', name: 'Maria Souza', source: 'Instagram', status: 'Em Atendimento', date: '07/04/2026', value: 2500, phone: '(21) 97777-6666', email: 'maria@email.com', product: 'iPhone 15 Pro', temperature: 'Morno' },
  { id: 'l3', name: 'Pedro Santos', source: 'Facebook', status: 'Novo', date: '08/04/2026', value: 800, phone: '(31) 96666-5555', email: 'pedro@email.com', product: 'Seminovos', temperature: 'Frio' },
  { id: 'l4', name: 'Ana Oliveira', source: 'WhatsApp', status: 'Qualificado', date: '06/04/2026', value: 5000, phone: '(41) 95555-4444', email: 'ana@email.com', product: 'MacBook Air M2', temperature: 'Quente' },
  { id: 'l5', name: 'Lucas Lima', source: 'Instagram', status: 'Perdido', date: '05/04/2026', value: 0, phone: '(51) 94444-3333', email: 'lucas@email.com', product: 'iPhone 14', temperature: 'Frio' },
  { id: 'l6', name: 'Carla Dias', source: 'WhatsApp', status: 'Venda Concluída', date: '04/04/2026', value: 3500, phone: '(61) 93333-2222', email: 'carla@email.com', product: 'iPhone 15 Pro Max', temperature: 'Quente' },
];

