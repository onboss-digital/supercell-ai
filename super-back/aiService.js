import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Converte datas locais do Acre (AAAA-MM-DD) para intervalos UTC correspondentes
function obterJanelaAcreUTC(dataInicioStr, dataFimStr) {
  const ACRE_OFFSET = 5 * 60 * 60 * 1000;
  const startLocal = new Date(`${dataInicioStr}T00:00:00`);
  const endLocal = new Date(`${dataFimStr}T23:59:59.999`);
  
  const startUTC = new Date(startLocal.getTime() + ACRE_OFFSET);
  const endUTC = new Date(endLocal.getTime() + ACRE_OFFSET);
  
  return [startUTC, endUTC];
}

// 1. Resumo Financeiro
async function obterResumoFinanceiroPeriodo(dataInicio, dataFim) {
  const [start, end] = obterJanelaAcreUTC(dataInicio, dataFim);
  const res = await pool.query(
    `SELECT COALESCE(SUM("valorTotal"), 0) as faturamento, COUNT(*) as qtd_vendas, COALESCE(SUM("lucro"), 0) as lucro 
     FROM "Sale" 
     WHERE "createdAt" >= $1 AND "createdAt" <= $2`, 
    [start, end]
  );
  return {
    periodo: { inicio: dataInicio, fim: dataFim },
    faturamento: parseFloat(res.rows[0].faturamento).toFixed(2),
    vendas: parseInt(res.rows[0].qtd_vendas),
    lucro: parseFloat(res.rows[0].lucro).toFixed(2)
  };
}

// 2. Vendas Detalhadas
async function listarVendasDetalhadasPeriodo(dataInicio, dataFim) {
  const [start, end] = obterJanelaAcreUTC(dataInicio, dataFim);
  const res = await pool.query(
    `SELECT id, "nomeCliente", "telefoneCliente", "produto", "valorTotal", "canalVenda", "tipoVenda", "vendedor", "createdAt"
     FROM "Sale" 
     WHERE "createdAt" >= $1 AND "createdAt" <= $2
     ORDER BY "createdAt" ASC`, 
    [start, end]
  );
  return res.rows.map(row => ({
    id: row.id,
    cliente: row.nomeCliente || 'N/A',
    telefone: row.telefoneCliente || 'N/A',
    produto: row.produto || 'N/A',
    valor: parseFloat(row.valorTotal).toFixed(2),
    canal: row.canalVenda || 'N/A',
    origem: row.tipoVenda || 'N/A',
    vendedor: row.vendedor || 'N/A',
    data: new Date(row.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' })
  }));
}

// 3. Ranking de Vendedores
async function obterRankingVendedoresPeriodo(dataInicio, dataFim) {
  const [start, end] = obterJanelaAcreUTC(dataInicio, dataFim);
  const res = await pool.query(
    `SELECT vendedor as nome, COUNT(*) as vendas, COALESCE(SUM("valorTotal"), 0) as faturamento
     FROM "Sale" 
     WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND vendedor IS NOT NULL AND vendedor <> ''
     GROUP BY vendedor
     ORDER BY faturamento DESC`, 
    [start, end]
  );
  return res.rows.map(row => ({
    nome: row.nome,
    vendas: parseInt(row.vendas),
    faturamento: parseFloat(row.faturamento).toFixed(2)
  }));
}

// 4. Ranking de Produtos
async function obterRankingProdutosPeriodo(dataInicio, dataFim) {
  const [start, end] = obterJanelaAcreUTC(dataInicio, dataFim);
  const res = await pool.query(
    `SELECT produto as nome, COUNT(*) as vendas
     FROM "Sale" 
     WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND produto IS NOT NULL AND produto <> ''
     GROUP BY produto
     ORDER BY vendas DESC`, 
    [start, end]
  );
  return res.rows.map(row => ({
    nome: row.nome,
    vendas: parseInt(row.vendas)
  }));
}

const biTools = [
  {
    name: "obter_resumo_financeiro_periodo",
    description: "Consulta o faturamento total, quantidade de vendas e lucro consolidado para um intervalo de datas específico. Use sempre que o usuário perguntar por faturamentos consolidados de datas que não estejam nos dados operacionais padrão.",
    schema: {
      type: "object",
      properties: {
        dataInicio: {
          type: "string",
          description: "Data inicial no formato ISO (AAAA-MM-DD)"
        },
        dataFim: {
          type: "string",
          description: "Data final no formato ISO (AAAA-MM-DD)"
        }
      },
      required: ["dataInicio", "dataFim"]
    }
  },
  {
    name: "listar_vendas_detalhadas_periodo",
    description: "Busca a lista de vendas individuais realizadas em um determinado período (com nome do cliente, produto comprado, valor, vendedor e origem). Use quando o usuário perguntar por detalhes específicos de quem comprou, o que foi vendido em uma data ou para rastrear transações individuais.",
    schema: {
      type: "object",
      properties: {
        dataInicio: {
          type: "string",
          description: "Data inicial no formato ISO (AAAA-MM-DD)"
        },
        dataFim: {
          type: "string",
          description: "Data final no formato ISO (AAAA-MM-DD)"
        }
      },
      required: ["dataInicio", "dataFim"]
    }
  },
  {
    name: "obter_ranking_vendedores_periodo",
    description: "Obtém a lista de vendedores e o faturamento acumulado/vendas efetuadas por cada um em um período. Use para responder a perguntas de desempenho da equipe comercial, como ranking de vendas por vendedor ou quanto um vendedor específico vendeu.",
    schema: {
      type: "object",
      properties: {
        dataInicio: {
          type: "string",
          description: "Data inicial no formato ISO (AAAA-MM-DD)"
        },
        dataFim: {
          type: "string",
          description: "Data final no formato ISO (AAAA-MM-DD)"
        }
      },
      required: ["dataInicio", "dataFim"]
    }
  },
  {
    name: "obter_ranking_produtos_periodo",
    description: "Obtém a contagem de vendas por produto in um determinado período. Use para saber quais aparelhos de celular foram os mais vendidos, quais marcas saíram ou a quantidade vendida de um modelo específico.",
    schema: {
      type: "object",
      properties: {
        dataInicio: {
          type: "string",
          description: "Data inicial no formato ISO (AAAA-MM-DD)"
        },
        dataFim: {
          type: "string",
          description: "Data final no formato ISO (AAAA-MM-DD)"
        }
      },
      required: ["dataInicio", "dataFim"]
    }
  }
];

export const generateAiInsights = async (metricsData, systemPrompt, modelName = "gpt-4o-mini") => {
  if (!process.env.OPENAI_API_KEY) {
    return "Configuração pendente: Adicione sua OPENAI_API_KEY no arquivo .env para ativar o Jarvis.";
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
  });

  const prompt = `
    ### [DADOS REAIS DA OPERAÇÃO - PRIORIDADE MÁXIMA] ###
    - Gasto Total: R$ ${metricsData.totalSpent || metricsData.spent || 0}
    - Resultados (Conversas): ${metricsData.results || metricsData.leads || 0}
    - CPA (Custo por Lead): R$ ${metricsData.cpa || 0}
    - Novos Seguidores (Ads): ${metricsData.followers || 0}
    - Alcance: ${metricsData.reach || 0}
    - Impressões: ${metricsData.impressions || 0}
    - Cliques no Link: ${metricsData.linkClicks || 0}
    - CTR: ${metricsData.ctr || "0%"}
    - CPC: R$ ${metricsData.cpc || 0}
    - Faturamento PDV: R$ ${metricsData.faturamentoPDV || 0}
    ####################################################

    PERSONALIDADE E REGRAS:
    ${systemPrompt || "Você é o Jarvis, um assistente virtual estrategista especializado em gestão de tráfego pago."}

    REGRAS DE OURO PARA SUA ANÁLISE:
    1. Se o CTR estiver abaixo de 1%, o problema é o CRIATIVO.
    2. Se o CPA estiver alto mas o CTR estiver bom, o problema é o ATENDIMENTO.
    3. Se o faturamento PDV estiver baixo em relação ao gasto, o ROAS está comprometido.
    4. IMPORTANTE: No início da sua resposta, confirme os valores que você está analisando (Gasto e Resultados).

    TAREFA:
    Analise os dados acima e forneça um relatório curto (máximo 4 parágrafos). 
    Identifique se o desempenho está saudável, aponte o maior GARGALO atual e dê 2 sugestões práticas de melhoria.
    Use um tom profissional focado em lucro conforme o DNA. Não use emojis.
  `;

  try {
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error("Erro ao chamar OpenAI:", error);
    return "O Jarvis está temporariamente indisponível. Verifique sua chave de API ou limites de crédito.";
  }
};

export const generateJarvisChatResponse = async (chatHistory, metricsData, config = {}, modelName = "gpt-4o-mini", customGoals = [], knowledgeContext = "") => {
  if (!process.env.OPENAI_API_KEY) {
    return "Falta configurar a chave da OpenAI no arquivo .env, senhor.";
  }

  const now = new Date();
  const timeContext = now.toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' });
  const fullDateString = now.toLocaleDateString('pt-BR', { dateStyle: 'full', timeZone: 'America/Rio_Branco' });

  const systemPrompt = config.systemPrompt;
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
  });

  const salesString = metricsData?.recentSales?.length > 0 
    ? metricsData.recentSales.map(s => {
        const saleDate = s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' }) : 'N/A';
        return `- Cliente: ${s.nomeCliente || 'N/A'} | Produto: ${s.produto || 'N/A'} | Valor: R$ ${s.valorTotal} | Plataforma de Contato: ${s.canalVenda || 'N/A'} | Origem da Venda: ${s.tipoVenda || 'N/A'} | Vendedor: ${s.vendedor || 'N/A'} | Data: ${saleDate}`;
      }).join('\n')
    : "Nenhuma venda recente registrada.";

  const corePersona = `Você é o J.A.R.V.I.S., o mordomo executivo e estrategista de elite do usuário.
DATA DE HOJE EXATA: ${fullDateString}
HORA ATUAL: ${timeContext} (Rio Branco, AC)
TRATAMENTO: Sua missão é servir com precisão absoluta. Siga rigorosamente as instruções de tratamento definidas na PERSONALIDADE MESTRE acima. ATENÇÃO: NUNCA invente ou use datas antigas do histórico da conversa. O dia real de hoje é ${fullDateString}. Ignore qualquer contradição temporal no histórico de mensagens abaixo; o tempo passou e hoje é um novo dia.

[FERRAMENTAS DE BUSCA DE VENDAS E BI COMERCIAL]
Você possui acesso a ferramentas de banco de dados para consultar informações de vendas do PDV (sincronizadas do MercadoPhone). Use-as sempre que o usuário fizer perguntas analíticas sobre datas específicas, rankings, vendedores ou produtos que não estejam consolidadas no bloco [DADOS OPERACIONAIS (MES E REAL-TIME)] padrão.
- Se o usuário perguntar de faturamento ou quantidade de vendas de um dia isolado do passado (ex: "quanto vendemos no dia 20?"), chame a ferramenta obter_resumo_financeiro_periodo.
- Se ele pedir detalhes de quem comprou ou transações específicas em um dia (ex: "quem comprou celular ontem?"), chame a ferramenta listar_vendas_detalhadas_periodo.
- Se ele quiser saber sobre performance de vendedores (ex: "quem vendeu mais este mês?"), chame a ferramenta obter_ranking_vendedores_periodo.
- Se ele quiser saber quais aparelhos saíram ou quantidade de um modelo (ex: "qual celular saiu mais na semana?"), chame a ferramenta obter_ranking_produtos_periodo.
Ao receber a resposta da ferramenta, elabore sua resposta baseando-se estritamente naqueles dados brutos retornados pelo banco.

[VENDAS RECENTES NO PDV]
${salesString}

[BASE DE CONHECIMENTO DISPONÍVEL]
${knowledgeContext || "Nenhuma informação adicional na base de conhecimento."}

[METAS DE NEGÓCIO ATIVAS]
${customGoals.length > 0 
  ? customGoals.map(g => `- ${g.name}: ${g.value} ${g.unit || ''} (${g.period || 'geral'})`).join('\n')
  : `
- Lucro Médio por Unidade: R$ ${config.markupPerUnit || 0}
- Meta de Conversão (Lead -> Venda): ${config.targetConversionRate || 0}%
- Limite de CPA (Custo por Lead): R$ ${config.cpaThreshold || 0}
- Limite de CTR Mínimo: ${config.ctrThreshold || 0}%
- Meta de Mensagens (7 dias): ${config.weeklyMessageGoal || 0}
`}

[INTELIGÊNCIA DE DADOS]
- Você tem acesso em tempo real ao Gerenciador de Anúncios (Meta Ads) e ao Banco de Dados do CRM.

[VOCABULÁRIO DE DADOS]
- O dado "leads_facebook" reflete métricas do Meta Ads. Use este número APENAS quando o usuário perguntar sobre "Leads" ou "Campanhas".
- O dado "contatos_crm" reflete a realidade do sistema interno (Banco de Dados). Use este número SEMPRE que o usuário perguntar sobre "Contatos", "Conversas", "Mensagens" ou "CRM".
- Se o usuário perguntar de "Contatos", responda com o número de "contatos_crm" sem misturar com a métrica da Meta.

[REGRAS DE OURO]
1. PROIBIDO QUALQUER TERMO EM INGLÊS (Ex: Use "Alcance" em vez de "Reach", "Gasto" em vez de "Spend", "Lances" em vez de "Bids").
2. PROIBIDO EMOJIS EM QUALQUER PARTE DO PROJETO (NEM NA FALA, NEM NO TEXTO DA TELA).
3. Na [FALA], escreva siglas e símbolos por extenso (Ex: "reais" em vez de "R$").
4. NUNCA LEIA OS DADOS DA TABELA NA [FALA]. Se houver uma tabela na [TELA], use frases como "Os dados detalhados seguem abaixo, senhor" ou "Como pode ver nos números na tela..." e foque seu áudio apenas na análise estratégica.
5. SÍNTESE VOCAL ESTRATÉGICA: Na [FALA], use números apenas para destacar vitórias ou alertar sobre problemas. Não liste métricas em sequência.
6. PRECISÃO MATEMÁTICA E TEMPORAL EXTREMA: Jamais invente ou alucine métricas, datas ou faturamentos. O que está no bloco [DADOS OPERACIONAIS (MES E REAL-TIME)] é a única verdade matemática. Use EXCLUSIVAMENTE os valores consolidados desse bloco para responder a quaisquer perguntas quantitativas sobre faturamento, volume de vendas, custo por lead ou gasto em anúncios desses períodos (hoje, ontem, 7 dias, 30 dias, mês atual). Nunca invente vendas que não existam.
7. COMPREENSÃO DE ORIGENS DE DADOS: Os blocos [VENDAS RECENTES NO PDV] e [HISTÓRICO RECENTE (ÚLTIMOS 5 CONTATOS NO CRM)] são de uso estritamente qualitativo (para citar produtos, vendedores, ou detalhes comerciais). NUNCA conte o número de itens ou some valores desses blocos qualitativos para responder sobre o "faturamento de ontem" ou "quantidade de vendas de hoje", pois eles contêm apenas registros recentes parciais.
8. PROIBIÇÃO ABSOLUTA DE CORTESIAS E FILLERS ROBÓTICOS: Você NUNCA deve terminar suas respostas com frases de preenchimento, cortesias repetitivas ou perguntas de call center como "Se precisar de mais alguma informação, estou à disposição", "Como posso ajudar?", "Estou aqui para ajudar", "Se precisar de mais algum detalhe, estou à disposição", etc. O Jarvis fala de forma assertiva e encerra a mensagem imediatamente após a última análise/sugestão.

[PROTOCOLO DE SÍNTESE VOCAL (A SUA VOZ - TAG [FALA])]
- Objetivo: Ser um sócio estratégico altamente pró-ativo. NÃO seja um mero leitor de métricas. 
- VOCÊ DEVE DAR SUGESTÕES: Se um número está ruim, sugira o que fazer (ex: pausar campanha, trocar criativo). Se está bom, sugira escalar. Aja por conta própria com ideias de melhoria.
- Se houver dados técnicos em tabelas, diga algo como "Senhor, organizei os dados exatos na tela abaixo, mas a minha leitura sobre eles é a seguinte..." E ENTÃO CONTINUE FALANDO SUA ANÁLISE COMPLETA E SUGESTÕES. Não interrompa sua fala só porque a tabela está na tela.
- Foque em responder: O que está acontecendo? O que isso significa? E principalmente: O QUE DEVEMOS FAZER AGORA?
- Tom: Decidido, interpretativo, extremamente intuitivo e 100% em português brasileiro.

[PROTOCOLO DE ASSERTIVIDADE]
1. Diagnóstico imediato: Aponte a conclusão na primeira frase da [FALA].
2. A seção [TELA] deve conter a "prova real" (tabelas e dados brutos) para consulta visual do usuário.
3. Encerramento Direto e Seco: Termine a resposta no último insight ou recomendação. É PROIBIDO incluir qualquer frase final de cortesia padrão, como oferecer ajuda adicional, dizer que está à disposição ou perguntar se há algo mais a fazer. Apenas termine.

[PROTOCOLO DE IDENTIFICAÇÃO DE CAMPANHAS]
- Identifique campanhas pelo nome ou parte dele (ex: "seguidores", "29/04") usando a lista de [CAMPANHAS ATIVAS].
- Use os dados reais da campanha para responder, nunca diga que não tem dados se a campanha estiver na lista.

[PROTOCOLO DE ANÁLISE COMPARATIVA]
- Sempre cruze Gasto (Meta) com Faturamento (PDV) para calcular o ROAS real.
- Compare o período solicitado com os outros períodos (Hoje vs Ontem vs Mês).
- INSIGHT ACIONÁVEL: Se o CTR estiver baixo ou o CPC alto, sugira trocas de criativos ou ajustes de público específicos.

[METODOLOGIA DE CONSULTORIA]
- Se o ROAS estiver abaixo de 3.0, use um tom de urgência.
- Se houver muitos leads mas poucas vendas no PDV, sugira revisar o script comercial.

[PROTOCOLO DE TRANSIÇÃO E COMPLEXIDADE]
- Sempre que a solicitação exigir cruzamento de dados históricos (ex: últimos 30 dias), comparação profunda entre períodos ou análise de ROI/ROAS real, você DEVE iniciar sua resposta com a tag [TRANSICAO].
- Dentro da tag [TRANSICAO], coloque uma frase curta e natural de transição. Exemplos:
    * "Um momento, senhor. Estou cruzando as métricas da Meta com o PDV."
    * "Só um instante, vou verificar a consistência dos dados nas últimas janelas."
    * "Aguarde um momento enquanto sintetizo os resultados do mês."
    * "Estou acessando o banco de dados agora. Conferindo os números..."
    * "Deixe-me conferir o desempenho das campanhas. Um segundo."
    * "Vou analisar o histórico de conversão para ser mais preciso. Só um momento."
- Varie as frases para manter a naturalidade. Use apenas para análises que de fato exijam processamento.

[MANUAL DO SISTEMA SUPERCELL AI]
Se o usuário perguntar o que cada tela ou funcionalidade faz, use este guia:
- **Dashboard Geral**: Visão panorâmica de resultados financeiros. Gasto total em anúncios, Vendas fechadas (PDV), ROAS real e CPA. Mostra o "pulso" do negócio.
- **Campanhas**: Controle remoto dos anúncios da Meta. Lista as campanhas ativas e permite pausá-las ou ativá-las diretamente por aqui, sem precisar abrir o Facebook.
- **Funil de Vendas**: Visão Kanban das etapas de venda. Ajuda a visualizar as taxas de conversão entre as fases e encontrar gargalos onde os clientes estão travando.
- **Relatórios da IA**: É a minha casa, senhor. Sua central de comando por voz e texto, onde estou disponível para cruzar dados operacionais e gerar inteligência estratégica para suas decisões.
- **Configurações**: Onde fica o cérebro operacional. Permite conectar a Meta (Facebook), configurar chaves da OpenAI, ajustar metas de lucro e treinar a minha base de conhecimento.

[ESTRUTURA OBRIGATÓRIA DA RESPOSTA]
Sua resposta deve SEMPRE seguir este formato exato:

[TRANSICAO] (Opcional: Use apenas se a análise for complexa. Frase curta de verificação de dados. Proibido emojis.)

[FALA]
(Sua fala deve ser rica, interpretativa e ALTAMENTE PROATIVA. Dê sugestões de próximos passos. Fale o que está bom, o que está ruim e aja de forma inteligente. Não pare de falar apenas porque há uma tabela abaixo. Proibido emojis e siglas.)

[TELA]
### STATUS DO SISTEMA
**Meta Ads:** [CONECTADO] | **PDV:** [ATIVO] | **Brain:** [100%]
---

### DESEMPENHO E MÉTRICAS
| Métrica | Valor Atual | Saúde |
| :--- | :--- | :--- |
| **Investimento** | R$ 00,00 | (vs Ontem) |
| **CPA / Lead** | R$ 00,00 | (Tendência) |
| **Faturamento** | R$ 00,00 | (Conversão) |
| **ROAS Real** | 0.00 | (ROI) |

---

### INSIGHTS E PLANO DE AÇÃO
- **DIAGNÓSTICO:** (Saudável / Atenção / Crítico)
- **ANÁLISE:** (Um insight curto sobre o porquê desses números)
- **AÇÃO 24H:** (A instrução cirúrgica estratégica)

[DADOS OPERACIONAIS (MES E REAL-TIME)]
- HOJE: ${JSON.stringify(metricsData.timeContext?.hoje)}
- ONTEM: ${JSON.stringify(metricsData.timeContext?.ontem)}
- 7 DIAS: ${JSON.stringify(metricsData.timeContext?.ultimos7Dias)}
- 30 DIAS: ${JSON.stringify(metricsData.timeContext?.ultimos30Dias)}
- MES ATUAL: ${JSON.stringify(metricsData.timeContext?.mesAtual)}

[CAMPANHAS ATIVAS (MES ATUAL)]
${metricsData.campaigns?.length > 0 
  ? metricsData.campaigns.map(c => `- Nome: ${c.nome} | Status: ${c.status} | Gasto: R$ ${c.gastoMes} | Leads: ${c.leadsMes} | CTR: ${c.ctr} | CPC: R$ ${c.cpc}`).join('\n')
  : "Nenhuma campanha detalhada encontrada no contexto."
}

[EXEMPLO DE RESPOSTA IDEAL]
[FALA] Senhor Gustavo, hoje geramos quarenta e nove leads. Eu organizei o detalhamento por campanhas na tela abaixo para sua conferência, mas a minha análise sobre isso é que, embora o volume esteja bom, nosso custo por contato subiu um pouco na campanha de Android. Eu sugiro fortemente que o senhor pause os criativos em vídeo que estão rodando nela há mais de sete dias e injete novos testes de imagem estática para tentar baratear esse custo. O faturamento global, por outro lado, saltou para mil e quatrocentos reais. Se mantivermos esse ritmo, bateremos a meta da semana amanhã.
[TELA] ### DESEMPENHO E METRICAS
| Metrica | Valor Atual | Saude |
| :--- | :--- | :--- |
| **Investimento** | R$ 88,75 | (Baixo) |
| **CPA / Lead** | R$ 2,33 | (Atencao) |
| **Faturamento** | R$ 1.450,00 | (Alto) |
| **ROAS Real** | 16.33 | (Alta Performance) |
---
- **DIAGNOSTICO:** Saudavel
- **ACAO 24H:** Pausar videos antigos na campanha Android e testar imagens.
`;

  const finalPrompt = `### PERSONALIDADE MESTRE (CONFIGURADA PELO USUÁRIO) ###
${systemPrompt || "Você é um assistente estratégico focado em resultados e lucro."}

### PROTOCOLO TÉCNICO DE ARQUITETURA ###
${corePersona}`;

  const messages = [
    new SystemMessage(finalPrompt),
  ];

  for (const msg of chatHistory) {
    const cleanContent = msg.content ? msg.content.replace(/^\[Mensagem enviada em:.*?\]\n?/i, '').trim() : '';

    if (msg.role === 'user') {
      let contentWithTime = cleanContent;
      if (msg.createdAt) {
        const msgDate = new Date(msg.createdAt);
        const msgTimeStr = msgDate.toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' });
        contentWithTime = `[Mensagem enviada em: ${msgTimeStr}]\n${cleanContent}`;
      }
      messages.push(new HumanMessage(contentWithTime));
    } else if (msg.role === 'jarvis' || msg.role === 'assistant') {
      messages.push(new AIMessage(cleanContent));
    }
  }

  const modelWithTools = model.bindTools(biTools);

  try {
    const response = await modelWithTools.invoke(messages);
    
    // Se o modelo invocar uma ferramenta
    if (response.tool_calls && response.tool_calls.length > 0) {
      messages.push(response);
      
      for (const toolCall of response.tool_calls) {
        let toolResult = null;
        const { dataInicio, dataFim } = toolCall.args;
        
        try {
          if (toolCall.name === "obter_resumo_financeiro_periodo") {
            toolResult = await obterResumoFinanceiroPeriodo(dataInicio, dataFim);
          } else if (toolCall.name === "listar_vendas_detalhadas_periodo") {
            toolResult = await listarVendasDetalhadasPeriodo(dataInicio, dataFim);
          } else if (toolCall.name === "obter_ranking_vendedores_periodo") {
            toolResult = await obterRankingVendedoresPeriodo(dataInicio, dataFim);
          } else if (toolCall.name === "obter_ranking_produtos_periodo") {
            toolResult = await obterRankingProdutosPeriodo(dataInicio, dataFim);
          }
        } catch (dbErr) {
          console.error(`Erro ao executar ferramenta ${toolCall.name}:`, dbErr);
          toolResult = { error: "Erro ao consultar banco de dados comercial." };
        }
        
        messages.push(new ToolMessage({
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id
        }));
      }
      
      const finalResponse = await modelWithTools.invoke(messages);
      return finalResponse.content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    }
    
    return response.content.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
  } catch (error) {
    console.error("Erro ao chamar OpenAI Chat com Ferramentas:", error);
    return "Falha de conexão com os servidores centrais da OpenAI, senhor.";
  }
};

export const generateNftyShortSummary = async (metricsData, systemPrompt, modelName = "gpt-4o-mini", isWeekly = false) => {
  if (!process.env.OPENAI_API_KEY) {
    return isWeekly ? "Resumo semanal indisponivel (configurar chave)." : "Resumo diario indisponivel (configurar chave).";
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0.5,
    maxRetries: 3,
    timeout: 15000,
  });

  const prompt = `
    Analise os seguintes dados operacionais da Supercell AI ${isWeekly ? 'desta SEMANA' : 'de HOJE'}:
    - Faturamento: R$ ${metricsData.faturamento || 0}
    - Investimento em Anuncios: R$ ${metricsData.investimento || 0}
    - Lucro Liquido: R$ ${metricsData.lucro || 0}
    - ROAS: ${metricsData.roas || 0}x
    - Vendas: ${metricsData.vendas || 0}
    - Leads Novos: ${metricsData.leads || 0}
    - Taxa de Conversao: ${metricsData.conversao || 0}%

    Sua tarefa e gerar uma UNICA frase curta (maximo 120 caracteres) em Portugues do Brasil que resuma a performance de forma executiva, objetiva e acionavel.
    NAO use emojis. NAO use ingles.
    Exemplo: "Excelente performance com ROAS de 8x e faturamento em alta, impulsionado pela melhor conversao dos leads."
  `;

  try {
    const response = await model.invoke(prompt);
    let summary = response.content.trim();
    summary = summary.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    if (summary.length > 150) {
      summary = summary.substring(0, 147) + "...";
    }
    return summary;
  } catch (error) {
    console.error("Erro ao gerar resumo para nfty:", error);
    return isWeekly ? "Desempenho semanal consolidado e estavel." : "Performance diaria dentro dos parametros.";
  }
};
