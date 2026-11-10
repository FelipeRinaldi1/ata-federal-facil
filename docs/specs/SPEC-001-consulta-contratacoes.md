# Especificação Técnica e Funcional (Spec)

## 1. Visão Geral do Produto
O **ConsultaContratações** é uma ferramenta web client-side (SPA) voltada a servidores e equipes de compras públicas para localização ágil de **Atas de Registro de Preços (ARP)** vigentes no PNCP (Portal Nacional de Contratações Públicas) para fins de **Adesão (Carona)** no âmbito da Esfera Federal.

---

## 2. Dores Resolvidas
1. **Poluição por Atas Avulsas:** Um mesmo Edital/Pregão gera dezenas de Atas individuais, saturando a busca do PNCP oficial.
2. **Falta de Hierarquia Edital -> Atas:** Dificuldade em enxergar o conjunto da contratação.
3. **Filtro de Órgão Inexistente/Limitado:** Incapacidade de restringir a busca a órgãos específicos na esfera federal.
4. **Vigência:** Necessidade de descartar rapidamente atas já expiradas ou sem tempo hábil para tramitação de adesão.
5. **Acesso Fácil a Documentos:** Redução de cliques para alcançar o Termo de Referência, Edital e Propostas homologadas.

---

## 3. Arquitetura e Diretrizes de Front-end
* **Framework:** Angular 19+ / 22+ moderno.
  * **Componentes:** Standalone Components exclusivamente.
  * **Estado:** Signals reativos (`signal`, `computed`).
  * **Controle de Fluxo:** Nova sintaxe nativa `@if`, `@for`, `@empty` (sem diretivas legadas `*ngIf`/`*ngFor`).
* **Design & Estilo:**
  * **Identidade Visual Sóbria:** Inspirada nas proporções e seriedade da Rede Federal, sem fazer menção a marcas ou siglas específicas.
  * **Paleta Calibrada (Agradável e Confortável aos Olhos):**
    - Cor primária institucional: Verde Floresta Profundo (`#22863A` / hover `#1E7533`), com contraste WCAG AAA sobre branco;
    - Detalhe estrutural: Faixa sutil de 4px no topo do header em `#22863A`;
    - Detalhes de alerta / vencimento: Vermelho Carmim / Rubi sóbrio (`#B91C1C` / `#991B1B`);
    - Fundos e superfícies: `neutral-100` e `white` puro;
    - Bordas: 1px cinza neutro (`border-neutral-200` e `border-neutral-300`).
  * **Modo Escuro / Claro (Dark Mode):**
    - Alternador com ícone funcional no cabeçalho;
    - Detecção automática de preferência do sistema operacional (`prefers-color-scheme`);
    - Persistência no `localStorage` sob a chave `consulta_contratacoes_theme_v1`;
    - Aplicação da classe `.dark` no elemento raiz com cores ajustadas em `neutral-900`/`neutral-950` e bordas `neutral-800`.
  * **Zero Clichês de IA:** Sem gradientes roxos/azuis, sem sombras neon, sem cards falsos de métricas no topo.
  * **Grid e Espaçamento:** Sistema rigoroso de 8px (`p-4`, `gap-4`, `p-3`).
  * **Ícones:** Somente estritamente funcionais.
* **Integração Externa:**
  * Endpoint oficial do PNCP: `https://pncp.gov.br/api/search/`
  * Regras fixas de requisição: `esferas=F`, `modalidades=6`, `tipos_documento=ata`.
  * Filtros dinâmicos: `q` (termo), `ufs` (UF), `data_inicial`, `data_final`, `pagina`, `tam_pagina`.

---

## 4. Requisitos Funcionais (RF)
* **RF01 - Regras Fixas de Negócio (100% Transparentes no Código / Zero Ruído Visual):**
  * **Modalidade:** Sempre fixo em `Pregão - Eletrônico` (`modalidades=6`).
  * **Esfera:** Sempre fixo em `Federal` (`esferas=F`).
  * **Permite Adesão (Carona):** Sempre fixo em `Sim` (exclui automaticamente atas que vedam carona).
  * **Status de Vigência:** Sempre fixo em `Apenas Vigentes` (exclui automaticamente atas expiradas).
* **RF02 - Controles Visuais Ativos:**
  * **Objeto ou Item (Termo no PNCP):** Campo de busca principal com suporte a `Enter`.
  * **UF do Órgão:** Seletor com todas as 27 UFs brasileiras (AC a TO), com busca automática ao alterar.
  * **Intervalo de Datas:** `Publicado A Partir De` e `Publicado Até` (convertidos para `AAAAMMDD`).
  * **Profundidade:** Seleção da quantidade de páginas para varredura: 5 págs (~100 atas), 10 (~200), 15 (~300), 25 (~500) e 50 págs (~1.000 atas).
  * **Mecanismo Anti-Rate-Limit:** Varredura sequencial com pipeline RxJS (`concatMap` + delay com jitter de ~250ms e retry automático) para evitar bloqueios ou queda de conexão do PNCP.
  * **Indicador de Progresso em Tempo Real:** Feedback página a página durante o carregamento de grandes volumes.
  * **Filtro Instantâneo por Órgão:** Caixa de texto para filtrar os resultados já carregados por nome do Órgão ou CNPJ.
  * **Ordenação Dinâmica de Editais:**
    - `Mais Atas` (Padrão: prioriza editais maiores com mais lotes/opções);
    - `Maior Vigência Restante` (prioriza editais com atas de maior prazo para tramitação de adesão);
    - `Mais Recente` (data de publicação mais nova no PNCP);
    - `Priorizar Não Vistos` (coloca editais pendentes no topo para produtividade de análise);
    - `Órgão (A → Z)` (ordem alfabética institucional).
* **RF03 - Sistema de Checkmark e Rastreamento de Análise (Persistência no Navegador):**
  * **Check individual na Ata:** Permite marcar uma ata específica como analisada/vista. Ao marcar, o texto é tachado e o botão fica preenchido.
  * **Check de 3 Estados no Pregão (Edital Pai):**
    - `pendente` (Vazio): nenhuma ata analisada;
    - `em-analise` (Incompleto): barra horizontal âmbar indicando análise parcial;
    - `analisado` (Completo / Visto): ícone de checkmark sobre fundo escuro.
  * **Feedback Visual do Card Completo:** Quando todas as atas do pregão forem vistas, o card assume tom sóbrio de concluído (`bg-slate-100`, borda `border-slate-300`, leve opacidade de item arquivado).
  * **Persistência Offline:** Salvo no `localStorage` sob a chave `consulta_contratacoes_analisadas_v1`.
  * **Filtro por Status de Análise:** Dropdown com opções: `Todos os status`, `Não visto (Pendente)`, `Incompleto (Em análise)`, `Visto (Completo)`.
* **RF04 - Agrupamento por Edital (Chave: CNPJ + Ano + Sequencial Compra):**
  * Cada cartão principal representa um **Pregão / Edital**.
  * Mostra: Órgão, CNPJ, UF, Modalidade/Número, Objeto resumido e link direto para o PNCP.
  * Agrupa sob ele todas as **Atas vinculadas** encontradas.
* **RF04 - Filtro por Vigência:**
  * Toggle *"Apenas Vigentes"* (padrão: ativado).
  * Tag de status com cálculo de dias restantes para expiração (`vigenciaFim >= hoje`).
* **RF05 - Restrição Rigorosa de Esfera (Apenas Federal):**
  * O sistema descarta órgãos municipais e estaduais no agrupamento, restringindo resultados exclusivamente a órgãos da Esfera Federal (`esfera_id === 'F'`).
* **RF06 - Filtros em Tempo Real (Client-Side):**
  * Filtro por nome ou CNPJ do Órgão (busca instantânea sobre os dados carregados).
  * Filtro por UF.
  * Toggle *"Permite Carona (Adesão)"*.
* **RF07 - Expansão de Atas e Documentos:**
  * Acordeão para visualizar as atas de cada pregão.
  * Links diretos para: Página da Ata no PNCP, Edital no PNCP e botões para copiar links de adesão.
* **RF08 - Suíte de Testes Automatizados:**
  * Testes unitários e de integração de fluxo de dados executados via Vitest (`npm test`).
* **RF13 - Busca Profunda de Itens e Produtos (Página Dedicada `/busca-profunda`):**
  * Ferramenta de mineração em lote que consulta sequencialmente os itens de compras do PNCP para editais federais vigentes com carona.
  * Mecanismo de fila assíncrona RxJS com controle de taxa (`delay(200)` e jitter) para total conformidade com o WAF do PNCP.
  * Barra de progresso percentual e feedback de status em tempo real com opção de pausar/cancelar.
  * Tabela rica consolidada contendo: Número do Item, Descrição com destaque em negrito, Quantidade/Unidade, Valor Unitário e Total homologado/estimado, Órgão Licitante, UF e Link direto para o Edital.
  * Filtros locais na tabela por Órgão e refinamento textual de descrição, ordenação em múltiplas colunas e paginação (15, 30, 50 por página).
  * Exportação tabular direta para planilha em formato CSV.

---

## 7. Requisitos Não Funcionais (RNF)
* **RNF01 - Zero Backend:** Não depender de servidor próprio para deploy; compatível com GitHub Pages, Vercel, Cloudflare Pages ou execução local.
* **RNF02 - Performance e Feedback:** Loading states claros com barra de progresso durante requisições de páginas sucessivas; tratamento gracioso de rate limits (429/500).
* **RNF03 - Responsividade e Acessibilidade:** Interface fluida para desktop e mobile com padrões WCAG e design Tailwind.

---

## 8. Roadmap de Próximas Entregas (Backlog de Evolução)


### Fase 2 - Detalhamento de Itens e Produtos (Concluída)
* **RF09 - Listagem de Itens/Produtos do Edital:**
  * Consumo sob demanda do endpoint público:
    `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seqCompra}/itens`
  * Exibição de tabela compacta e sóbria contendo:
    - Número do item;
    - Descrição técnica do produto/bem e informações complementares;
    - Quantidade licitada e unidade de medida;
    - Valor unitário estimado e homologado (R$);
    - Valor total estimado e homologado (R$);
    - Situação do item (homologado, cancelado, etc.) com badge de status;
    - Identificação do fornecedor vencedor por item/lote.
  * Campo de busca textual rápida interna sobre os itens do próprio edital.
  * Filtro por situação do item (`Todos`, `Homologados`, `Outros`).

### Fase 3 - Instrução Processual de Carona (SEI / SUAP)
* **RF10 - Exportação para Estudo Técnico Preliminar (ETP):**
  * Botão de exportação para planilha (.xlsx / .csv) das atas selecionadas/vistas com campos essenciais de vantajosidade e justificativa de preço.
* **RF11 - Links e Download Direto de Documentos:**
  * Consumo do endpoint `/arquivos` para disponibilizar links diretos para o download do Edital e Termo de Referência (TR).

