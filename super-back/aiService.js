import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';

dotenv.config();

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
    Use um tom profissional focado em lucro, Senhor Gustavo. Não use emojis.
  `;

  try {
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error("Erro ao chamar OpenAI:", error);
    return "O Jarvis está temporariamente indisponível. Verifique sua chave de API ou limites de crédito.";
  }
};

export const generateJarvisChatResponse = async (chatHistory, metricsData, systemPrompt, modelName = "gpt-4o-mini") => {
  if (!process.env.OPENAI_API_KEY) {
    return "Falta configurar a chave da OpenAI no arquivo .env, senhor.";
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: modelName,
    temperature: 0.7,
    maxRetries: 3,
    timeout: 30000,
  });

  const leadsString = metricsData?.recentLeads?.length > 0 
    ? metricsData.recentLeads.map(l => `${l.name} (${l.status} via ${l.platform})`).join(', ') 
    : "Nenhum lead capturado recentemente.";
    
  const salesString = metricsData?.recentSales?.length > 0 
    ? metricsData.recentSales.map(s => `R$ ${s.valorTotal} (${s.canalVenda} - ${s.tipoVenda})`).join(', ') 
    : "Nenhuma venda recente registrada.";

  const corePersona = `Você é o J.A.R.V.I.S., o mordomo executivo e estrategista de elite do Senhor Gustavo.
TRATAMENTO: Sua missão é servi-lo com precisão absoluta. Trate o usuário exclusivamente como 'Senhor Gustavo'.

[INTELIGÊNCIA DE DADOS]
Você tem acesso em tempo real a métricas detalhadas (Gasto, Leads, Faturamento, CTR, CPC, Cliques, Impressões e ROAS) de 5 períodos: Hoje, Ontem, Últimos 7 Dias, Últimos 30 Dias e Mês Atual.
Sempre que o Senhor Gustavo perguntar sobre o desempenho de um período, use os dados específicos desse período no seu Mapa de Dados abaixo.

[REGRAS DE OURO]
1. Proibido emojis em qualquer parte.
2. Na [FALA], escreva siglas e símbolos por extenso (ex: R$ 50 -> cinquenta reais, 2% -> dois por cento, CTR -> cê-tê-erre).
3. Seja assertivo. Se o ROAS estiver baixo, aponte o erro. Se o CTR estiver ruim, critique o criativo.

[PROTOCOLO DE ASSERTIVIDADE]
1. Você não é um chat-bot amigável. Você é um consultor de elite que custa caro.
2. Seu tempo e o do Senhor Gustavo são valiosos. Vá direto ao ponto.
3. Diagnóstico imediato: Se os dados mostram um problema (ex: CTR < 1% ou Frequência > 3), aponte-o na primeira frase.
4. Sugestão Acionável: Termine sempre com uma recomendação clara (ex: "Pause a campanha X", "Troque o criativo da Y").

[DADOS OPERACIONAIS (MENSAL E REAL-TIME)]
- HOJE: ${JSON.stringify(metricsData.timeContext?.hoje)}
- ONTEM: ${JSON.stringify(metricsData.timeContext?.ontem)}
- 7 DIAS: ${JSON.stringify(metricsData.timeContext?.ultimos7Dias)}
- MÊS ATUAL: ${JSON.stringify(metricsData.timeContext?.mesAtual)}

[CAMPANHAS ATIVAS (PERFORMANCE DO MÊS)]
${metricsData.campaigns?.map(c => `- ${c.nome} (${c.status}): Gasto R$ ${c.gastoMes}, CTR ${c.ctr}, CPC R$ ${c.cpc}, Freq ${c.freq}, Leads ${c.leadsMes}`).join('\n') || "Nenhuma campanha ativa encontrada."}
[FORMATO DE RESPOSTA OBRIGATÓRIO]
Sua resposta DEVE seguir este formato rigoroso:
[FALA] (Texto natural para o sintetizador de voz, sem símbolos, sem siglas, tom de mordomo estrategista)
[TELA] (Markdown rico, tabelas, negrito, dados técnicos para exibição visual)

Exemplo:
[FALA] Senhor Gustavo, identifiquei que o nosso custo por clique nos últimos sete dias subiu para um real e vinte centavos.
[TELA] ### Análise Semanal
* **CPC:** R$ 1,20
* **Status:** Alerta de Criativo`;

  const finalPrompt = `### PERSONALIDADE MESTRE (CONFIGURADA PELO USUÁRIO) ###
${systemPrompt || "Você é um assistente estratégico focado em resultados e lucro."}

### PROTOCOLO TÉCNICO DE ARQUITETURA ###
${corePersona}`;

  const messages = [
    new SystemMessage(finalPrompt),
  ];

  for (const msg of chatHistory) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'jarvis' || msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content));
    }
  }

  try {
    const response = await model.invoke(messages);
    return response.content;
  } catch (error) {
    console.error("Erro ao chamar OpenAI Chat:", error);
    return "Falha de conexão com os servidores centrais da OpenAI, senhor.";
  }
};
