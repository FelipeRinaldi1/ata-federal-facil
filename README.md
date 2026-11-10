# Consulta Contratações Públicas

> **Localizador inteligente de Atas de Registro de Preços (ARP) e Editais para Adesão ("Carona") na Esfera Federal.**  
> Uma ferramenta web client-side (SPA) desenvolvida para simplificar e acelerar as rotinas de compras públicas em Institutos Federais, Universidades e órgãos federais.

[![Angular](https://img.shields.io/badge/Angular-22%2B-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tested-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PNCP](https://img.shields.io/badge/API-PNCP_Oficial-005696)](https://pncp.gov.br/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Sumário
- [A Dor que o Produto Resolve](#-a-dor-que-o-produto-resolve)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura e Metodologia](#-arquitetura-e-metodologia)
  - [Desenvolvimento Orientado por Especificação (Spec-Driven)](#desenvolvimento-orientado-por-especificação-spec-driven)
  - [IA-Assisted Engineering](#ia-assisted-engineering)
- [Stack Tecnológica](#-stack-tecnológica)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Testes Automatizados](#-testes-automatizados)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Integração e Contorno de Rate-Limit (PNCP)](#-integração-e-contorno-de-rate-limit-pncp)
- [Roadmap de Próximas Entregas](#-roadmap-de-próximas-entregas)
- [Licença](#-licença)

---

## 💡 A Dor que o Produto Resolve

Quando uma equipe de compras públicas precisa adquirir um conjunto de bens (ex: mobiliário escolar, equipamentos de TI, climatização) sem abrir uma licitação própria, o caminho legal mais eficiente é a **Adesão à Ata de Registro de Preços ("Carona")**, fundamentada na Lei 14.133/2021.

No entanto, a experiência no portal oficial do PNCP apresenta sérios gargalos:
1. **Atas Repetidas do Mesmo Edital:** Um único pregão gera dezenas de atas (uma por lote ou fornecedor). O PNCP lista cada ata isoladamente, gerando dezenas de páginas com resultados repetidos do mesmo processo.
2. **Falta de Hierarquia Edital ➔ Atas:** É inviável enxergar o conjunto da contratação sem clicar manualmente em cada ata individual.
3. **Ausência de Filtros Críticos:** Não é possível filtrar rapidamente por órgão gerenciador ou restringir à esfera de interesse mantendo o contexto agrupado.
4. **Desgaste Operacional com Vigência:** Dificuldade em identificar de imediato se a ata ainda tem tempo hábil de vigência para a instrução processual de carona.

O **Consulta Contratações** resolve esses problemas agrupando automaticamente os dados e entregando uma interface limpa, rápida e focada em tomada de decisão.

---

## ✨ Funcionalidades Principais

- **Agrupamento Automático por Edital Pai:** Dezenas de atas de um mesmo pregão são consolidadas em um único card informativo (`chave: CNPJ + Ano + Sequencial da Compra`).
- **Filtros Institucionais Estritos Pré-Configurados:**
  - Esfera **Federal** exclusivamente;
  - Modalidade **Pregão Eletrônico** (SRP);
  - **Permite Adesão (Carona):** Descarta automaticamente atas que vedam carona no edital;
  - **Apenas Vigentes:** Oculta compras cujas atas já expiraram.
- **Busca por Intervalo de Datas:** Filtros nativos de data de publicação (`Publicado a partir de` e `Publicado até`) convertidos automaticamente para o padrão `AAAAMMDD` da API oficial.
- **Seletor de UFs Completo:** Dropdown com todas as 27 UFs brasileiras com busca automática na API.
- **Filtro Instantâneo por Órgão / CNPJ:** Busca textual em tempo real no client-side sobre os dados carregados.
- **Sistema de Checkmark com 3 Estados e Persistência Local:**
  - Marcação individual por Ata (com texto tachado);
  - Checkmark de 3 estados no Pregão: **Pendente (vazio)**, **Incompleto (em análise)** e **Completo (visto)**;
  - Cards 100% vistos mudam de cor sutilmente para sinalizar conclusão;
  - **Persistência no Navegador:** Salvo automaticamente no `localStorage`;
  - Filtro dedicado por status: *Todos*, *Não visto*, *Incompleto* e *Visto*.
- **5 Critérios de Ordenação Dinâmica:**
  1. *Mais Atas* (padrão: prioriza editais maiores com múltiplos lotes);
  2. *Maior Vigência Restante* (prioriza atas com mais meses para tramitação);
  3. *Mais Recente* (data de publicação mais nova);
  4. *Priorizar Não Vistos* (empurra itens pendentes para o topo);
  5. *Órgão (A → Z)* (ordem alfabética).
- **Modo Escuro / Claro (Dark Mode):** Alternador sóbrio no cabeçalho com detecção automática do sistema operacional e persistência de preferência.
- **Zero Backend Próprio:** Toda a comunicação é feita diretamente entre o navegador do usuário e o PNCP, aproveitando as políticas de CORS aberto da API governamental.

---

## 🛠 Arquitetura e Metodologia

### Desenvolvimento Orientado por Especificação (Spec-Driven)
Este projeto foi concebido seguindo a metodologia **Spec-Driven Development (SDD)**:
1. Toda decisão arquitetural, regra de negócio e contrato de integração foi formalizada em documentos de especificação antes ou em paralelo à implementação.
2. A pasta [`docs/`](docs/) contém:
   - [`docs/specs/SPEC-001-consulta-contratacoes.md`](docs/specs/SPEC-001-consulta-contratacoes.md): Especificação completa de requisitos funcionais, não funcionais e regras de negócio.
   - [`docs/logs/CHANGELOG.md`](docs/logs/CHANGELOG.md): Registro cronológico de decisões técnicas e marcos evolutivos.

### IA-Assisted Engineering
O software foi construído em colaboração com agentes de inteligência artificial de última geração (Antigravity / DeepMind). A IA atuou como engenheira de software par:
- Criando a arquitetura reativa em Angular;
- Inspecionando e revertendo as peculiaridades do payload oficial do PNCP;
- Implementando cobertura contínua de testes automatizados com Vitest;
- Refatorando a interface para eliminar qualquer estética genérica de IA (gradientes agressivos, sombras artificiais) em favor de padrões neutros e profissionais alinhados ao serviço público.

---

## 💻 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Framework** | **Angular 22+** | Standalone Components, Signals nativos e novo Control Flow (`@if`, `@for`, `@empty`). |
| **Estilização** | **Tailwind CSS v4** | Design utilitário, paleta neutra sóbria, sistema de 8px e variantes customizadas para Dark Mode. |
| **Testes** | **Vitest + jsdom** | Testes unitários ultrarrápidos com suporte completo a ESM e DOM emulativo. |
| **Integração** | **RxJS + HttpClient** | Pipelines de requisições sequenciais com *throttling*, *jitter* e *retry logic*. |
| **Armazenamento** | **Web Storage (localStorage)** | Persistência descentralizada de checklist e preferências de tema. |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- **Node.js:** versão `>= 20.0.0` (recomendado Node 22+)
- **npm:** versão `>= 10.0.0`

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/ConsultaContratacoes.git
   cd ConsultaContratacoes/frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   # ou: npx ng serve --port 4200
   ```

4. **Acesse no navegador:**
   Abra [http://localhost:4200](http://localhost:4200).

---

## 🧪 Testes Automatizados

A aplicação possui suíte de testes unitários e de integração de fluxo de dados executada com **Vitest**:

```bash
cd frontend
npm test
```

Para rodar em modo contínuo (*watch*):
```bash
npm run test:watch
```

### O que é coberto pelos testes:
- **`PncpService`:**
  - Bloqueio estrito de esferas municipal e estadual;
  - Agrupamento de atas filhas no mesmo pregão pai;
  - Cálculo de dias restantes de vigência e badges de alerta;
  - Parâmetros enviados na API (esferas, modalidades, datas e UFs);
- **`App Component`:**
  - Estado inicial dos sinais de busca;
  - Filtragem instantânea por nome de órgão e CNPJ;
  - Filtragem reativa por status de análise;
  - Ordenação por maior vigência, mais recente e ordem alfabética;
- **`StatusAnaliseService`:**
  - Alternância de estados das atas;
  - Cálculo dos 3 estados do Pregão (pendente, incompleto e visto);
  - Persistência e restauração do `localStorage`;
- **`ThemeService`:**
  - Alternância entre modo claro e escuro e aplicação da classe `.dark`.

---

## 📁 Estrutura do Projeto

```
ConsultaContratacoes/
├── docs/                                  # Documentação de Engenharia (Spec-Driven)
│   ├── logs/
│   │   └── CHANGELOG.md                   # Log de decisões técnicas e releases
│   └── specs/
│       └── SPEC-001-consulta-contratacoes.md # Especificação funcional detalhada
├── frontend/                              # Aplicação Angular SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   │   └── pncp.models.ts         # Contratos e tipos da API PNCP
│   │   │   ├── services/
│   │   │   │   ├── pncp.service.ts        # Integração e lógica de agrupamento
│   │   │   │   ├── pncp.service.spec.ts   # Testes unitários do serviço PNCP
│   │   │   │   ├── status-analise.service.ts      # Checklist e localStorage
│   │   │   │   ├── status-analise.service.spec.ts # Testes de persistência
│   │   │   │   ├── theme.service.ts       # Controle de Dark/Light mode
│   │   │   │   └── theme.service.spec.ts  # Testes de tema
│   │   │   ├── app.ts                     # Componente raiz com Signals
│   │   │   ├── app.html                   # Template limpo com @if / @for
│   │   │   ├── app.spec.ts                # Testes de integração do componente
│   │   │   └── app.config.ts              # Provedores (HttpClient, Zoneless/Zone)
│   │   ├── main.ts                        # Bootstrap da aplicação
│   │   └── styles.css                     # Tailwind CSS v4 + tema personalizado
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts                   # Configuração de testes Vitest
└── README.md
```

---

## ⚡ Integração e Contorno de Rate-Limit (PNCP)

A API pública de busca do PNCP (`https://pncp.gov.br/api/search/`) é protegida por Web Application Firewall (WAF). Quando múltiplas requisições paralelas são disparadas, o servidor frequentemente derruba os sockets (`ECONNRESET`).

Para garantir estabilidade em buscas profundas (até 50 páginas / ~1.000 atas), o `PncpService` utiliza um pipeline sequencial com:
- **`concatMap`:** Garante que cada página só é requisitada após a resposta da anterior;
- **`delay` + Jitter:** Espaçamento orgânico de 220ms a 300ms entre requisições;
- **`retry({ count: 2, delay: 450 })`:** Recuperação transparente de quedas esporádicas de conexão;
- **Feedback em tempo real:** Notificação visual do progresso de coleta página por página.

---

## 🗺 Roadmap de Próximas Entregas

- [x] **Fase 2 - Detalhamento de Itens/Produtos:**
  - [x] Exibição inline dos produtos da licitação consumindo o endpoint oficial `/itens` do PNCP (descrição detalhada, quantitativos, unidades de medida e valores unitários/totais estimados e homologados);
  - [x] Filtros em tempo real por descrição, número do item e situação (homologados/outros);
  - [x] Detalhamento do fornecedor adjudicado por lote/item quando disponível.
- [ ] **Fase 3 - Apoio à Instrução de Processo (SEI / SUAP):**
  - Exportação de atas selecionadas para planilha de Estudo Técnico Preliminar (ETP);
  - Download em 1 clique do Edital e Termo de Referência oficiais via `/arquivos`;
  - Campo de anotações internas para histórico de contatos com o órgão gerenciador.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais informações.

---

*Desenvolvido com foco no aprimoramento da gestão e eficiência dos processos de contratações públicas federais.*
