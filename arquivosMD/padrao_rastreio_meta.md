# Padrão de Rastreamento de Anúncios no CRM (Meta Ads + Z-API)

Devido às limitações de ocultação de dados da Meta no envio para o WhatsApp Web (Z-API), a forma oficial de rastrear **exatamente** de qual Campanha e Anúncio o cliente veio é através de **Códigos de Referência Ocultos** nos Modelos de Mensagem.

Este guia define a Tabela de Padrões e detalha como a hierarquia da Meta se conecta com o CRM.

---

## 1. Como a Mágica Acontece (A Jornada do Código)

Abaixo está o ciclo de vida completo de como um anúncio na Meta deve ser estruturado e como ele se comporta quando o cliente clica. Vamos usar como exemplo a venda de um **Cabo Original**:

### Passo A: Criando a Estrutura na Meta (A Nomenclatura Interna)
No Gerenciador de Anúncios, você organiza o tráfego da seguinte forma (nomenclaturas que só o Gestor vê):
- 📁 **NOME DA CAMPANHA:** `Vendas-Cabos`
- 📂 **NOME DO CONJUNTO:** `Publico-Lookalike-30d`
- 📄 **NOME DO ANÚNCIO:** `Video-Cabo-Blindado`

### Passo B: Configurando o "Modelo de Mensagem"
No final da página de configuração do Anúncio (Video-Cabo-Blindado), ao invés de usar a saudação padrão, você clica em "Editar Modelo de Mensagem". Você configura a mensagem para o cliente da seguinte forma, adicionando o código `[Ref: Campanha / Anuncio]` no final:

> "Olá! Quero aproveitar a promoção do cabo blindado do vídeo. Pode me passar os valores? *[Ref: Vendas-Cabos / Video-Cabo-Blindado]*"

### Passo C: A Visão do Cliente
1. O cliente vê o anúncio `Video-Cabo-Blindado` no Instagram.
2. Ele clica no botão "Enviar Mensagem no WhatsApp".
3. O WhatsApp abre automaticamente com o texto pré-preenchido. **Ele não digita nada**, apenas aperta ENVIAR.

### Passo D: A Visão do seu CRM (O Filtro do Jarvis)
Quando essa mensagem chega no CRM (Z-API), o backend corta automaticamente os colchetes com os códigos técnicos e organiza as colunas:

- **Mensagem que o Atendente lê:** *"Olá! Quero aproveitar a promoção do cabo blindado do vídeo. Pode me passar os valores?"* (Limpa, sem poluição técnica).
- **Coluna Campanha (CRM):** `Vendas-Cabos`
- **Coluna Anúncio (CRM):** `Video-Cabo-Blindado`
- **Tag do Lead:** `Tráfego Pago`

> ⚠️ **REGRA DE OURO DO GESTOR DE TRÁFEGO:**
> Nunca duplique um anúncio ou campanha sem alterar a TAG `[Ref: ...]` no Modelo de Mensagem. Se duplicar um anúncio e criar o `Imagem-Cabo-Branco`, você **precisa** alterar a TAG no texto para `[Ref: Vendas-Cabos / Imagem-Cabo-Branco]`. Caso contrário, as vendas do criativo em Imagem serão atribuídas equivocadamente ao Vídeo.

---

## 2. Tabela de Exemplos

Use a tabela abaixo como inspiração para montar suas próprias nomenclaturas e etiquetas:

| Produto / Serviço | Nomenclatura da Campanha | Nome do Anúncio | Mensagem Pré-Configurada no Gerenciador de Anúncios (O que o cliente envia) |
| :--- | :--- | :--- | :--- |
| **iPhone 15 Pro** | C-Vendas-Apple | AD-Video-Promo | "Olá, gostei do iPhone 15 Pro do vídeo e quero saber o valor. *[Ref: C-Vendas-Apple / AD-Video-Promo]*" |
| **Cabos Originais** | C-Acessorios | AD-Carrossel-1 | "Oi, gostaria de ver os cabos que estão na promoção. *[Ref: C-Acessorios / AD-Carrossel-1]*" |
| **Conserto Tela** | C-Servicos-Local | AD-Imagem-Quebrada | "Olá, minha tela quebrou. Vocês fazem orçamento gratuito? *[Ref: C-Servicos-Local / AD-Imagem-Quebrada]*" |
| **Remarketing** | C-Remarketing-30D | AD-Desconto-10 | "Oi, recebi o desconto de 10% no Instagram e quero aproveitar! *[Ref: C-Remarketing-30D / AD-Desconto-10]*" |

> **Dica Prática:** Mantenha os nomes curtos e sem espaços (use hífens `-`), pois facilita a leitura e evita erros de digitação.
