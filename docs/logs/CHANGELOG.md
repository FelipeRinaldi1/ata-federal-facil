# Log de Decisões e Execução

## [2026-11-09] Inicialização do Projeto
* **Contexto:** Necessidade de agilizar buscas de Atas de Registro de Preços no PNCP para adesão/carona na Esfera Federal, eliminando duplicidade de atas do mesmo pregão e permitindo filtros por órgão e vigência.
* **Decisão Arquitetural:**
  * Frontend SPA em **Angular 22+ (Standalone + Signals)** com **Tailwind CSS**.
  * Consumo direto da API pública do PNCP (`https://pncp.gov.br/api/search/`), aproveitando que possui CORS aberto (`access-control-allow-origin: *`).
  * Sem necessidade de backend próprio.
* **Estrutura de Documentação:**
  * `docs/specs/SPEC-001-consulta-contratacoes.md`: Especificação de requisitos e fluxos.
  * `docs/logs/CHANGELOG.md`: Registro de marcos e decisões técnicas.

## [2026-11-09] Entrega da Versão Funcional (MVP v1.0)
* Configurado projeto Angular com Tailwind CSS e PostCSS.
* Implementado `PncpService`:
  * Busca paralela em múltiplas páginas de atas via RxJS (`forkJoin`).
  * Agrupamento de atas pelo pregão/edital pai (`chavePregao: cnpj_ano_sequencialCompra`).
  * Cálculo dinâmico de vigência ativa, dias restantes e identificação visual de prazos críticos.
* Desenvolvida interface moderna de busca e filtragem:
  * Campo de busca por termo no PNCP com suporte a Enter.
  * Filtro instantâneo por Órgão (nome ou CNPJ) no frontend.
  * Filtro por UF e Esfera (Federal, Estadual, Municipal).
  * Toggle *"Apenas Atas Vigentes"* ativo por padrão.
  * Card consolidado do Edital com expansão/recolhimento das atas vinculadas.
  * Links diretos para os Editais no PNCP e Atas/Propostas com botão de copiar link.
* Servidor de desenvolvimento rodando em `http://localhost:4200`.

## [2026-11-09] Atualização: Esfera Federal Exclusiva, Ajustes de Schema PNCP e Testes Unitários
* **Correção da Busca do PNCP:**
  * O payload real da API `/api/search/` utiliza `title`, `description`, `numero_sequencial_compra_ata`, `data_inicio_vigencia` e `data_fim_vigencia`. O modelo e o parser foram atualizados para ler esses campos corretamente.
* **Restrição Exclusiva à Esfera Federal:**
  * Removidos seletores de outras esferas.
  * O agrupador descarta qualquer ata municipal ou estadual, mantendo apenas órgãos federais (`esfera_id === 'F'` ou esfera "Federal").
* **Suíte de Testes Automatizados (Vitest):**
  * Instalado e configurado o **Vitest** no projeto Angular.
  * Implementados 4 testes para o `PncpService`:
    1. Filtragem estrita de Esfera Federal;
    2. Agrupamento de múltiplas atas no mesmo Edital Pai;
    3. Cálculo de vigência e dias restantes;
    4. Parâmetros e chamadas HTTP ao endpoint do PNCP.
  * Implementados 3 testes para o `App Component`:
    1. Estado inicial dos sinais de busca e filtros;
    2. Filtragem reativa por nome de Órgão e CNPJ;
    3. Ocultação reativa de editais sem atas vigentes.
  * **Status dos testes:** 7/7 passando com sucesso (`npm test`).

## [2026-11-09] Atualização: Filtro por Intervalo de Datas
* **Interface:**
  * Adicionados seletores nativos de data: `Publicado A Partir De` e `Publicado Até`.
  * Layout responsivo da barra de busca adaptado para acomodar os novos campos sem poluição visual.
* **Serviço (`PncpService`):**
  * Parâmetros `dataInicial` e `dataFinal` adicionados ao método `buscarAtas` e `buscarMultiplasPaginas`.
  * Conversão automática do formato ISO (`YYYY-MM-DD`) para o formato esperado pelo PNCP (`AAAAMMDD`, ex: `20250115`).
* **Testes Automatizados (Vitest):**
  * Adicionado teste unitário cobrindo o envio e formatação dos parâmetros de data no endpoint do PNCP.
  * **Status dos testes:** 8/8 passando com sucesso.

## [2026-11-09] Atualização: Checkmark de Atas e Pregões com 3 Estados e Persistência no LocalStorage
* **Serviço de Status de Análise (`StatusAnaliseService`):**
  * Gerencia o conjunto de IDs de atas analisadas via Angular Signals.
  * Persistência automática no `localStorage`.
  * Cálculo em tempo real do estado do Pregão (`pendente`, `em-analise`, `analisado`).
  * Ação rápida no Pregão: marcar/desmarcar todas as atas vinculadas em lote.
* **Componentes Visuais do Checkmark:**
  * **Checkbox da Ata:** Marca/desmarca a ata com tachado no título.
  * **Checkbox do Pregão com 3 Estados:**
    - Vazio: nenhuma ata do pregão vista;
    - Traço/Incompleto: status intermediário (em análise);
    - Check/Completo: todas as atas do pregão foram analisadas.
  * **Sinalização Visual do Card:** Cards 100% vistos assumem tom cinza sóbrio e discreto, destacando os pendentes.
* **Novo Filtro de Análise:**
  * Dropdown na barra com opções: *Todos os status*, *Não visto (Pendente)*, *Incompleto (Em análise)* e *Visto (Completo)*.
* **Testes Automatizados (Vitest):**
  * 3 novos testes unitários adicionados para o `StatusAnaliseService`.
  * 1 novo teste de integração adicionado no `App Component` para validar a filtragem reativa por status de análise.
  * **Status dos testes:** 12/12 passando com 100% de sucesso.

## [2026-11-09] Atualização: 5 Critérios de Ordenação dos Editais
* **Adicionado seletor de ordenação dinâmico:**
  1. **Mais Atas:** Prioriza editais com maior número de atas vigentes (lotes variados);
  2. **Maior Vigência Restante:** Prioriza editais com atas que têm mais dias até vencer (ótimo para processos lentos de carona);
  3. **Mais Recente:** Ordena por publicação mais nova no PNCP;
  4. **Priorizar Não Vistos:** Coloca os editais pendentes no topo e joga os já vistos para o fim;
  5. **Órgão (A → Z):** Ordem alfabética pelo nome do órgão gerenciador.
* **Testes e Build:**
  * Adicionado teste unitário cobrindo a ordenação reativa por vigência, ordem alfabética e recência.
  * **Status dos testes:** 13/13 passando com 100% de sucesso (`npm test`).

## [2026-11-09] Atualização: Suporte a Modo Escuro e Claro (Dark/Light Mode)
* **Novo Serviço `ThemeService`:**
  * Sinais reativos (`signal`) para alternância entre modo claro e escuro.
  * Suporte a preferência do sistema operacional (`prefers-color-scheme`).
  * Persistência da escolha do usuário no `localStorage` (`consulta_contratacoes_theme_v1`).
  * Adiciona/remove dinamicamente a classe `.dark` no elemento `<html>`.
* **Interface e Estilização Dark Mode:**
  * Botão comutador no cabeçalho superior com ícones sutis de sol e lua.
  * Estilização completa do painel de busca, inputs, gavetas de atas e cards em tons de cinza carvão e ardósia escuros (`neutral-900`, `neutral-950`, bordas `neutral-800`), mantendo contraste acessível.
* **Testes e Build:**
  * Adicionados 2 novos testes unitários para o `ThemeService`.
  * **Status dos testes:** 15/15 passando com 100% de sucesso (`npm test`).

## [2026-11-09] Registro de Backlog de Evolução (Fase 2 e 3)
* **Registrados na Especificação (`SPEC-001`):**
  - **Fase 2 (Detalhamento de Itens/Produtos):** Validação técnica concluída do endpoint `/compras/{ano}/{seqCompra}/itens` para renderização sob demanda da tabela de produtos com número de item, descrição, quantidade e valores homologados.
  - **Fase 3 (Instrução Processual de Carona):** Exportação dos editais selecionados para planilha de ETP, links diretos de arquivos `/arquivos` (Edital/TR) e campo de anotações internas persistidas.



## [2026-11-09] Atualização: Paleta Institucional Calibrada (Verde Floresta e Carmim Neutro)
* **Nova Identidade de Cores:**
  * Sem nenhuma menção nominal a instituições específicas.
  * Substituído o botão escuro pelo tom **Verde Floresta Profundo (`#22863A` / hover `#1E7533`)**, trazendo um visual institucional muito mais amigável, sóbrio e confortável para uso prolongado.
  * Adicionado friso sutil de 4px no topo do header em `#22863A` com ícone minimalista institucional.
  * Tags de atas vigentes atualizadas para verde esmeralda suave (`bg-emerald-50 text-[#1E7533]`).
  * Alertas de prazo/expiração ajustados para **Carmim Rubi (`#B91C1C`)**.
* **Qualidade e Estabilidade:**
  * Suíte com 13/13 testes unitários passando.
  * Build validado e em execução.



## [2026-11-09] Atualização: Expansão de Páginas e Mecanismo Anti-Rate-Limit
* **Descoberta da API do PNCP:**
  * O endpoint oficial do PNCP possui limite rígido de no máximo 20 a 50 itens por página; quando múltiplos requests são disparados simultaneamente em paralelo (`forkJoin`), o servidor do Serpro/PNCP derruba a conexão (`ECONNRESET` / Socket hang up).
* **Solução com Anti-Rate-Limit (Throttling com Jitter e Retry):**
  * Implementado pipeline sequencial em `PncpService.buscarMultiplasPaginas` utilizando RxJS `concatMap`, espaçamento de 220–300ms entre chamadas e `retry` automático em caso de instabilidade.
  * Adicionado suporte a até **50 páginas (até ~1.000 atas por busca)**.
  * Criado indicador visual de progresso em tempo real que mostra: *"Página X de Y (Z atas coletadas)"*.
* **Qualidade e Testes:**
  * 12/12 testes unitários e de integração passando.



## [2026-11-09] Atualização: Padronização com os Filtros do PNCP
* **Filtros Oficiais Embutidos:**
  * **Modalidade da Contratação:** Fixada em `Pregão - Eletrônico` (código `modalidades=6` na API do PNCP).
  * **Esfera:** Fixada em `Federal` (código `esferas=F` na API do PNCP e verificação no client-side).
  * **Permite Adesão (Carona):** Padrão selecionado em `Sim (Apenas Carona Autorizada)`.
  * **UFs:** Preenchido com a lista de todos os 27 estados da federação (`AC` a `TO`). Ao selecionar, envia o parâmetro `ufs={UF}` diretamente ao endpoint do PNCP.
* **Testes Automatizados (Vitest):**
  * Atualizados testes de serviço e componente para cobrir o envio de `esferas=F`, `modalidades=6`, `ufs` e filtro de adesão.
  * **Status dos testes:** 8/8 passando com sucesso (`npm test`).

## [2026-11-09] Refatoração de Design: Padrões Sóbrios e Angular Moderno Control Flow
* **Arquitetura Angular Moderna:**
  * Migração de 100% dos templates para o novo Angular Control Flow (`@if`, `@for`, `@empty`).
  * Remoção completa das diretivas legadas `*ngIf` e `*ngFor`.
* **Redesign Profissional e Sóbrio (Anti-AI Clichés):**
  * Eliminação de gradientes, cantos excessivamente arredondados e sombras artificiais.
  * Paleta neutra e contrastante (WCAG AA): fundos `neutral-100`/`white`, bordas sutis de 1px `neutral-200`/`neutral-300`, textos em `neutral-900`/`neutral-700`.
  * Remoção dos cartões de métricas genéricas; mantida apenas a contagem utilitária discreta.
  * Espaçamentos rigorosamente padronizados na grade de 8px (`gap-4`, `p-4`, `p-3`).
* **Testes e Build:**
  * Build com pacote reduzido (285 kB total).
  * 8/8 testes unitários passando.


## [2026-11-09] Atualização: Limpeza Visual Total dos Itens Fixos
* **Simplificação da Interface (UI Minimalista e Direta):**
  * Removidos todos os componentes visuais dos parâmetros que são regras fixas do sistema:
    - *Modalidade* (fixada internamente em Pregão Eletrônico);
    - *Esfera* (fixada internamente em Federal);
    - *Permite Adesão* (fixada internamente em `Sim` / true);
    - *Apenas Vigentes* (fixada internamente em `Sim` / true).
  * A tela agora contém apenas os campos que o usuário realmente precisa interagir:
    1. Objeto/Item Desejado;
    2. UF do Órgão (com todos os 27 estados);
    3. Intervalo de Datas (`A partir de` / `Até`);
    4. Profundidade de busca;
    5. Filtro instantâneo por Nome do Órgão / CNPJ.
* **Testes e Build:**
  * Atualizados testes unitários para a regra fixa.
  * Suíte com 100% de aprovação (8/8 testes passando) e build verificado com sucesso.





