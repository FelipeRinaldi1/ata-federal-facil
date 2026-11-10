import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, from, concatMap, delay, of, catchError } from 'rxjs';
import { PncpService } from '../../services/pncp.service';
import { ItemBuscaProfunda, PregaoAgrupado } from '../../models/pncp.models';

@Component({
  selector: 'app-busca-profunda-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './busca-profunda-page.html',
  styleUrl: './busca-profunda-page.css'
})
export class BuscaProfundaPage {
  private pncpService: PncpService;
  private varreduraSub?: Subscription;

  constructor(pncpService?: PncpService) {
    if (pncpService) {
      this.pncpService = pncpService;
    } else {
      this.pncpService = inject(PncpService);
    }
  }

  readonly todasUfs: string[] = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Parâmetros de Busca
  termoBusca = signal<string>('');
  filtroUf = signal<string>('');
  dataInicial = signal<string>('');
  dataFinal = signal<string>('');
  totalPaginas = signal<number>(5); // 5 (~100 atas), 10 (~200), 15 (~300), 25 (~500), 50 (~1k)

  // Estado da Varredura
  emExecucao = signal<boolean>(false);
  progressoAtual = signal<number>(0);
  progressoTotal = signal<number>(0);
  mensagemStatus = signal<string>('');
  erro = signal<string | null>(null);

  // Resultados
  todosItensEncontrados = signal<ItemBuscaProfunda[]>([]);
  feedbackCopiado = signal<string | null>(null);

  // Filtros sobre os itens minerados
  filtroTabelaOrgao = signal<string>('');
  filtroTabelaDescricao = signal<string>('');
  ordenacaoColuna = signal<'numero' | 'descricao' | 'orgao' | 'valorTotal' | 'quantidade'>('orgao');
  ordenacaoAsc = signal<boolean>(true);

  // Paginação da Tabela de Itens
  paginaAtual = signal<number>(1);
  itensPorPagina = signal<number>(15);

  itensFiltrados = computed(() => {
    let lista = this.todosItensEncontrados();
    const termoOrgao = this.normalizar(this.filtroTabelaOrgao());
    const termoDesc = this.normalizar(this.filtroTabelaDescricao());

    if (termoOrgao) {
      lista = lista.filter(item => 
        this.normalizar(item.nomeOrgao).includes(termoOrgao) ||
        item.cnpj.includes(termoOrgao) ||
        item.cnpjFormatado.includes(termoOrgao)
      );
    }

    if (termoDesc) {
      lista = lista.filter(item => 
        this.normalizar(item.descricao).includes(termoDesc)
      );
    }

    const coluna = this.ordenacaoColuna();
    const asc = this.ordenacaoAsc();

    return [...lista].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (coluna === 'numero') {
        valA = a.numeroItem;
        valB = b.numeroItem;
      } else if (coluna === 'descricao') {
        valA = a.descricao;
        valB = b.descricao;
      } else if (coluna === 'orgao') {
        valA = a.nomeOrgao;
        valB = b.nomeOrgao;
      } else if (coluna === 'valorTotal') {
        valA = a.valorTotalHomologado || a.valorTotal || 0;
        valB = b.valorTotalHomologado || b.valorTotal || 0;
      } else if (coluna === 'quantidade') {
        valA = a.quantidade || 0;
        valB = b.quantidade || 0;
      }

      if (typeof valA === 'string') {
        const comp = this.normalizar(valA).localeCompare(this.normalizar(valB));
        return asc ? comp : -comp;
      }

      return asc ? (valA - valB) : (valB - valA);
    });
  });

  totalPaginasTabela = computed(() => {
    const total = this.itensFiltrados().length;
    return Math.max(1, Math.ceil(total / this.itensPorPagina()));
  });

  itensPaginados = computed(() => {
    const lista = this.itensFiltrados();
    const pag = this.paginaAtual();
    const porPag = this.itensPorPagina();
    const inicio = (pag - 1) * porPag;
    return lista.slice(inicio, inicio + porPag);
  });

  totalValorEstimadoGeral = computed(() => {
    return this.itensFiltrados().reduce((acc, item) => {
      const v = item.valorTotalHomologado || item.valorTotal || 0;
      return acc + v;
    }, 0);
  });

  iniciarVarredura() {
    const termo = this.termoBusca().trim();
    if (!termo) {
      this.erro.set('Digite um termo de pesquisa para localizar os itens nos editais.');
      return;
    }

    if (this.varreduraSub) {
      this.varreduraSub.unsubscribe();
    }

    this.emExecucao.set(true);
    this.erro.set(null);
    this.todosItensEncontrados.set([]);
    this.progressoAtual.set(0);
    this.progressoTotal.set(0);
    this.paginaAtual.set(1);
    this.mensagemStatus.set('Consultando atas e editais federais vigentes...');

    // Passo 1: Busca atas/editais do PNCP com os mesmos filtros e profundidade de páginas da busca de editais
    this.pncpService.buscarMultiplasPaginas(
      termo,
      this.totalPaginas(),
      this.dataInicial() || undefined,
      this.dataFinal() || undefined,
      this.filtroUf() || undefined
    ).subscribe({
      next: (itensPncp) => {
        const pregoes = this.pncpService.agruparPorPregao(itensPncp, true);
        const pregoesValidos = pregoes
          .filter(p => p.atas.some(a => a.isVigente && a.permiteAdesao));

        if (pregoesValidos.length === 0) {
          this.emExecucao.set(false);
          this.mensagemStatus.set('');
          this.erro.set(`Nenhum edital federal vigente com carona encontrado para o termo "${termo}" no intervalo selecionado. Tente alterar os filtros ou aumentar o número de páginas.`);
          return;
        }

        this.executarVarreduraItens(pregoesValidos, termo);
      },
      error: (err) => {
        console.error('Erro na etapa 1 da busca profunda:', err);
        this.emExecucao.set(false);
        this.mensagemStatus.set('');
        this.erro.set('Falha ao consultar editais no PNCP. Verifique a conexão e tente novamente.');
      }
    });
  }

  cancelarVarredura() {
    if (this.varreduraSub) {
      this.varreduraSub.unsubscribe();
    }
    this.emExecucao.set(false);
    this.mensagemStatus.set('Varredura interrompida pelo usuário.');
  }

  private executarVarreduraItens(pregoes: PregaoAgrupado[], termoOriginal: string) {
    this.progressoTotal.set(pregoes.length);
    this.progressoAtual.set(0);
    const termoNorm = this.normalizar(termoOriginal);

    let concluidos = 0;
    const itensAcumulados: ItemBuscaProfunda[] = [];

    // Fila sequencial com pequeno delay para respeitar o limite de taxa do PNCP
    this.varreduraSub = from(pregoes).pipe(
      concatMap(pregao => {
        this.mensagemStatus.set(`Analisando itens: ${pregao.nomeOrgao.substring(0, 45)}... (${concluidos + 1} de ${pregoes.length})`);
        return this.pncpService.consultarItensCompra(pregao.cnpj, pregao.ano, pregao.seqCompra).pipe(
          delay(200), // Respeito ao limite do WAF do PNCP
          catchError(() => of([])),
          concatMap(itens => of({ pregao, itens }))
        );
      })
    ).subscribe({
      next: ({ pregao, itens }) => {
        concluidos++;
        this.progressoAtual.set(concluidos);

        for (const it of itens) {
          const descNorm = this.normalizar(it.descricao);
          if (descNorm.includes(termoNorm)) {
            itensAcumulados.push({
              numeroItem: it.numeroItem,
              descricao: it.descricao,
              quantidade: it.quantidadeHomologada || it.quantidade,
              unidadeMedida: it.unidadeMedida,
              valorUnitarioEstimado: it.valorUnitarioEstimado,
              valorTotal: it.valorTotal,
              valorUnitarioHomologado: it.valorUnitarioHomologado,
              valorTotalHomologado: it.valorTotalHomologado,
              criterioJulgamentoNome: it.criterioJulgamentoNome,
              situacaoCompraItemNome: it.situacaoCompraItemNome,
              nomeFornecedor: it.nomeRazaoSocialFornecedor,
              cnpj: pregao.cnpj,
              cnpjFormatado: pregao.cnpjFormatado,
              ano: pregao.ano,
              seqCompra: pregao.seqCompra,
              nomeOrgao: pregao.nomeOrgao,
              unidadeNome: pregao.unidadeNome,
              uf: pregao.uf,
              linkPregaoPncp: pregao.linkPregaoPncp
            });
          }
        }

        // Atualiza a tabela incrementalmente durante a varredura
        this.todosItensEncontrados.set([...itensAcumulados]);
      },
      complete: () => {
        this.emExecucao.set(false);
        this.mensagemStatus.set(`Varredura concluída! ${itensAcumulados.length} item(ns) localizados em ${concluidos} edital(is) federais.`);
      },
      error: (err) => {
        console.error('Erro durante a fila de itens:', err);
        this.emExecucao.set(false);
        this.mensagemStatus.set('');
        this.erro.set('Ocorreu uma instabilidade na consulta de itens do PNCP.');
      }
    });
  }

  mudarOrdenacao(coluna: 'numero' | 'descricao' | 'orgao' | 'valorTotal' | 'quantidade') {
    if (this.ordenacaoColuna() === coluna) {
      this.ordenacaoAsc.update(v => !v);
    } else {
      this.ordenacaoColuna.set(coluna);
      this.ordenacaoAsc.set(true);
    }
  }

  mudarPagina(delta: number) {
    const nova = this.paginaAtual() + delta;
    if (nova >= 1 && nova <= this.totalPaginasTabela()) {
      this.paginaAtual.set(nova);
    }
  }

  definirItensPorPagina(qtd: number) {
    this.itensPorPagina.set(qtd);
    this.paginaAtual.set(1);
  }

  copiarTexto(texto: string, label: string) {
    navigator.clipboard.writeText(texto).then(() => {
      this.feedbackCopiado.set(`${label} copiado!`);
      setTimeout(() => this.feedbackCopiado.set(null), 2500);
    });
  }

  destacarTermo(texto: string, termo: string): string {
    if (!texto) return '';
    if (!termo || !termo.trim()) return this.escaparHtml(texto);

    const termoTrim = termo.trim();
    const regexEspecial = termoTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const padraoFlexivel = regexEspecial
      .replace(/a/gi, '[aáàãâä]')
      .replace(/e/gi, '[eéèêë]')
      .replace(/i/gi, '[iíìîï]')
      .replace(/o/gi, '[oóòõôö]')
      .replace(/u/gi, '[uúùûü]')
      .replace(/c/gi, '[cç]');

    const regex = new RegExp(`(${padraoFlexivel})`, 'gi');
    const textoSeguro = this.escaparHtml(texto);
    return textoSeguro.replace(regex, '<strong class="font-bold text-neutral-900 dark:text-neutral-100">$1</strong>');
  }

  exportarCsv() {
    const itens = this.itensFiltrados();
    if (itens.length === 0) return;

    const cabecalho = ['Item', 'Descricao', 'Quantidade', 'Unidade', 'Valor_Unitario', 'Valor_Total', 'Orgao', 'CNPJ', 'UF', 'Ano', 'Compra_Seq', 'Link_Edital'];
    const linhas = itens.map(i => [
      i.numeroItem,
      `"${(i.descricao || '').replace(/"/g, '""')}"`,
      i.quantidade || '',
      `"${i.unidadeMedida || ''}"`,
      i.valorUnitarioHomologado || i.valorUnitarioEstimado || '',
      i.valorTotalHomologado || i.valorTotal || '',
      `"${(i.nomeOrgao || '').replace(/"/g, '""')}"`,
      `"${i.cnpjFormatado || i.cnpj}"`,
      i.uf || '',
      i.ano,
      i.seqCompra,
      `"${i.linkPregaoPncp}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas.map(l => l.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `itens_busca_profunda_${this.termoBusca() || 'pncp'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private escaparHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
