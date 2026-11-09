import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PncpService } from './services/pncp.service';
import { StatusAnaliseService } from './services/status-analise.service';
import { ThemeService } from './services/theme.service';
import { PregaoAgrupado, AtaVinculada, CriterioOrdenacao } from './models/pncp.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private pncpService: PncpService;
  statusAnaliseService: StatusAnaliseService;
  themeService: ThemeService;

  constructor(
    pncpService?: PncpService, 
    statusAnaliseService?: StatusAnaliseService,
    themeService?: ThemeService
  ) {
    this.pncpService = pncpService ?? inject(PncpService);
    this.statusAnaliseService = statusAnaliseService ?? inject(StatusAnaliseService);
    this.themeService = themeService ?? inject(ThemeService);
  }

  // Lista Completa de UFs Brasileiras
  readonly todasUfs: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Parâmetros de Busca na API
  termoBusca = signal<string>('mobiliário');
  filtroUf = signal<string>('');
  dataInicial = signal<string>('');
  dataFinal = signal<string>('');
  totalPaginas = signal<number>(5); // Padrão: 5 páginas (100 atas)
  carregando = signal<boolean>(false);
  progressoCarregamento = signal<string>('');
  erro = signal<string | null>(null);

  // Dados Brutos Agrupados
  todosPregoes = signal<PregaoAgrupado[]>([]);

  // Filtro de Órgão em Tempo Real
  filtroOrgao = signal<string>('');

  // Filtro por Status de Análise: 'todos' | 'pendente' | 'em-analise' | 'analisado'
  filtroStatusAnalise = signal<'todos' | 'pendente' | 'em-analise' | 'analisado'>('todos');

  // Critério de Ordenação dos Editais
  ordenacao = signal<CriterioOrdenacao>('mais-atas');

  // Notificação Copiar
  feedbackCopiado = signal<string | null>(null);

  // Lista Filtrada Reativa (Regras Fixas: Esfera Federal + Pregão Eletrônico + Permite Adesão = Sim + Apenas Vigentes = Sim)
  pregoesFiltrados = computed(() => {
    const pregoes = this.todosPregoes();
    const orgaoTerm = this.normalizar(this.filtroOrgao());
    const statusFiltro = this.filtroStatusAnalise();
    // Invocamos signal de atasAnalisadas para reatividade instantânea ao clicar no check
    const _setAnalise = this.statusAnaliseService.atasAnalisadas();

    return pregoes
      .map(p => {
        // Regra fixa: apenas atas vigentes e que permitem adesão (carona)
        const atasFiltradas = p.atas.filter(a => a.isVigente && a.permiteAdesao);
        const atasIds = atasFiltradas.map(a => a.id);
        const statusAnalise = this.statusAnaliseService.getPregaoStatus(atasIds);

        return {
          ...p,
          atasFiltradas,
          statusAnalise
        };
      })
      .filter(p => {
        if (p.atasFiltradas.length === 0) {
          return false;
        }

        // Filtro por Status de Análise (Todos / Não Visto / Incompleto / Visto)
        if (statusFiltro !== 'todos' && p.statusAnalise !== statusFiltro) {
          return false;
        }

        // Filtro por Órgão (Nome ou CNPJ ou Unidade)
        if (orgaoTerm) {
          const nomeMatch = this.normalizar(p.nomeOrgao).includes(orgaoTerm);
          const unidadeMatch = p.unidadeNome ? this.normalizar(p.unidadeNome).includes(orgaoTerm) : false;
          const cnpjMatch = p.cnpj.includes(orgaoTerm) || p.cnpjFormatado.includes(orgaoTerm);
          if (!nomeMatch && !unidadeMatch && !cnpjMatch) return false;
        }

        return true;
      })
      .sort((a, b) => this.aplicarOrdenacao(a, b, this.ordenacao()));
  });

  // Estatísticas Rápidas
  estatisticas = computed(() => {
    const list = this.pregoesFiltrados();
    let totalAtasExibidas = 0;
    let totalVigentes = 0;

    for (const p of list) {
      totalAtasExibidas += p.atasFiltradas.length;
      totalVigentes += p.atasFiltradas.filter(a => a.isVigente).length;
    }

    return {
      totalPregoes: list.length,
      totalAtas: totalAtasExibidas,
      totalVigentes
    };
  });

  ngOnInit() {
    this.executarBusca();
  }

  executarBusca() {
    const termo = this.termoBusca().trim();
    if (!termo) {
      this.erro.set('Digite um termo para pesquisar.');
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);
    this.progressoCarregamento.set(`Consultando página 1 de ${this.totalPaginas()}...`);

    this.pncpService.buscarMultiplasPaginas(
      termo,
      this.totalPaginas(),
      this.dataInicial() || undefined,
      this.dataFinal() || undefined,
      this.filtroUf() || undefined,
      (prog) => {
        this.progressoCarregamento.set(`Página ${prog.atual} de ${prog.total} (${prog.itensCarregados} atas coletadas)`);
      }
    ).subscribe({
      next: (itens) => {
        // Agrupa garantindo APENAS Esfera Federal
        const agrupados = this.pncpService.agruparPorPregao(itens, true);
        this.todosPregoes.set(agrupados);
        this.carregando.set(false);
        this.progressoCarregamento.set('');

        if (agrupados.length === 0) {
          this.erro.set(`Nenhuma ata federal encontrada para o termo "${termo}" no PNCP. Tente aumentar a profundidade da busca.`);
        }
      },
      error: (err) => {
        console.error('Erro na requisição PNCP:', err);
        this.erro.set('Falha na comunicação com o PNCP. Tente novamente em instantes.');
        this.carregando.set(false);
        this.progressoCarregamento.set('');
      }
    });
  }

  toggleExpandirPregao(pregaoChave: string) {
    this.todosPregoes.update(pregoes =>
      pregoes.map(p => p.chavePregao === pregaoChave ? { ...p, expandido: !p.expandido } : p)
    );
  }

  expandirTodos() {
    this.todosPregoes.update(pregoes => pregoes.map(p => ({ ...p, expandido: true })));
  }

  recolherTodos() {
    this.todosPregoes.update(pregoes => pregoes.map(p => ({ ...p, expandido: false })));
  }

  obterIdsAtas(pregao: PregaoAgrupado): string[] {
    return (pregao.atasFiltradas || pregao.atas).map(a => a.id);
  }

  obterTituloCheckPregao(status?: string): string {
    if (status === 'analisado') return 'Edital visto / concluído (clique para desmarcar)';
    if (status === 'em-analise') return 'Edital incompleto (algumas atas vistas - clique para marcar todas)';
    return 'Marcar todas as atas deste edital como vistas';
  }

  copiarTexto(texto: string, label: string) {
    navigator.clipboard.writeText(texto).then(() => {
      this.feedbackCopiado.set(`${label} copiado!`);
      setTimeout(() => this.feedbackCopiado.set(null), 2500);
    });
  }

  limparFiltros() {
    this.filtroOrgao.set('');
    this.filtroUf.set('');
    this.filtroStatusAnalise.set('todos');
    this.ordenacao.set('mais-atas');
    this.dataInicial.set('');
    this.dataFinal.set('');
    this.executarBusca();
  }

  private aplicarOrdenacao(a: PregaoAgrupado, b: PregaoAgrupado, criterio: CriterioOrdenacao): number {
    switch (criterio) {
      case 'maior-vigencia': {
        // Ordena por maior dias restantes de vigência
        const vigA = Math.max(...(a.atasFiltradas || a.atas).map(x => x.diasRestantes || 0), 0);
        const vigB = Math.max(...(b.atasFiltradas || b.atas).map(x => x.diasRestantes || 0), 0);
        return vigB - vigA;
      }

      case 'mais-recente': {
        // Ordena por data de publicação ou ano/sequencial mais novo
        const dataA = a.dataPublicacao ? new Date(a.dataPublicacao).getTime() : 0;
        const dataB = b.dataPublicacao ? new Date(b.dataPublicacao).getTime() : 0;
        if (dataA !== dataB) return dataB - dataA;
        if (b.ano !== a.ano) return b.ano - a.ano;
        return Number(b.seqCompra) - Number(a.seqCompra);
      }

      case 'nao-vistos-primeiro': {
        // Prioriza: pendente (1), em-analise (2), analisado (3)
        const peso = (status?: string) => {
          if (status === 'pendente') return 1;
          if (status === 'em-analise') return 2;
          return 3;
        };
        const dif = peso(a.statusAnalise) - peso(b.statusAnalise);
        if (dif !== 0) return dif;
        // Critério de desempate: mais atas
        return (b.atasFiltradas?.length || 0) - (a.atasFiltradas?.length || 0);
      }

      case 'orgao-az': {
        return this.normalizar(a.nomeOrgao).localeCompare(this.normalizar(b.nomeOrgao));
      }

      case 'mais-atas':
      default: {
        return (b.atasFiltradas?.length || 0) - (a.atasFiltradas?.length || 0);
      }
    }
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
