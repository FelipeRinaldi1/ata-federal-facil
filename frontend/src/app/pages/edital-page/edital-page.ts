import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PncpService } from '../../services/pncp.service';
import { StatusAnaliseService } from '../../services/status-analise.service';
import { PregaoAgrupado, DetalheCompraPncp, ItemCompraPncp } from '../../models/pncp.models';

@Component({
  selector: 'app-edital-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edital-page.html',
  styleUrl: './edital-page.css'
})
export class EditalPage implements OnInit {
  private route = inject(ActivatedRoute);
  private pncpService = inject(PncpService);
  statusAnaliseService = inject(StatusAnaliseService);

  cnpj = signal<string>('');
  ano = signal<string>('');
  seqCompra = signal<string>('');

  carregando = signal<boolean>(true);
  erro = signal<string | null>(null);
  feedbackCopiado = signal<string | null>(null);

  pregao = signal<PregaoAgrupado | null>(null);
  detalheCompra = signal<DetalheCompraPncp | null>(null);

  // Fase 2: Itens / Produtos do Edital
  itensCompra = signal<ItemCompraPncp[]>([]);
  carregandoItens = signal<boolean>(false);
  termoBuscaItens = signal<string>('');
  filtroSituacaoItem = signal<string>('todos');

  // Paginação dos Itens
  paginaItensAtual = signal<number>(1);
  itensPorPagina = signal<number>(10); // Opções: 10, 15, 20

  // Paginação das Atas
  paginaAtasAtual = signal<number>(1);
  atasPorPagina = signal<number>(5); // Opções: 5, 10, 20

  // Estados recolhíveis das seções
  secaoItensRecolhida = signal<boolean>(false);
  secaoAtasRecolhida = signal<boolean>(false);

  // Itens filtrados com busca em tempo real
  itensFiltrados = computed(() => {
    const lista = this.itensCompra();
    const busca = this.normalizar(this.termoBuscaItens().trim());
    const sit = this.filtroSituacaoItem();

    return lista.filter(item => {
      if (sit !== 'todos') {
        const itemSit = (item.situacaoCompraItemNome || '').toLowerCase();
        if (sit === 'homologado' && !itemSit.includes('homolog')) return false;
        if (sit === 'outros' && itemSit.includes('homolog')) return false;
      }

      if (!busca) return true;

      const numMatch = String(item.numeroItem).includes(busca);
      const descMatch = this.normalizar(item.descricao || '').includes(busca);
      const complMatch = this.normalizar(item.informacaoComplementar || '').includes(busca);
      const fornecedorMatch = this.normalizar(item.nomeRazaoSocialFornecedor || '').includes(busca);

      return numMatch || descMatch || complMatch || fornecedorMatch;
    });
  });

  // Itens Paginados para Exibição
  totalPaginasItens = computed(() => {
    const total = this.itensFiltrados().length;
    const porPag = this.itensPorPagina();
    return Math.max(1, Math.ceil(total / porPag));
  });

  itensPaginados = computed(() => {
    const lista = this.itensFiltrados();
    const pag = this.paginaItensAtual();
    const porPag = this.itensPorPagina();
    const inicio = (pag - 1) * porPag;
    return lista.slice(inicio, inicio + porPag);
  });

  // Atas Paginadas para Exibição
  totalPaginasAtas = computed(() => {
    const total = this.pregao()?.atas?.length || 0;
    const porPag = this.atasPorPagina();
    return Math.max(1, Math.ceil(total / porPag));
  });

  atasPaginadas = computed(() => {
    const atas = this.pregao()?.atas || [];
    const pag = this.paginaAtasAtual();
    const porPag = this.atasPorPagina();
    const inicio = (pag - 1) * porPag;
    return atas.slice(inicio, inicio + porPag);
  });

  // Estatísticas de Itens
  estatisticasItens = computed(() => {
    const total = this.itensCompra().length;
    const filtrados = this.itensFiltrados().length;
    let somaEstimada = 0;
    let somaHomologada = 0;

    for (const item of this.itensCompra()) {
      somaEstimada += item.valorTotal || (item.quantidade && item.valorUnitarioEstimado ? item.quantidade * item.valorUnitarioEstimado : 0);
      somaHomologada += item.valorTotalHomologado || (item.quantidadeHomologada && item.valorUnitarioHomologado ? item.quantidadeHomologada * item.valorUnitarioHomologado : 0);
    }

    return { total, filtrados, somaEstimada, somaHomologada };
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const cnpj = params.get('cnpj') || '';
      const ano = params.get('ano') || '';
      const seqCompra = params.get('seqCompra') || '';

      this.cnpj.set(cnpj);
      this.ano.set(ano);
      this.seqCompra.set(seqCompra);

      this.carregarDadosEdital(cnpj, ano, seqCompra);
    });
  }

  carregarDadosEdital(cnpj: string, ano: string, seqCompra: string) {
    this.carregando.set(true);
    this.erro.set(null);

    // 1. Tenta recuperar do cache local do serviço
    const pregaoLocal = this.pncpService.obterPregaoCache(cnpj, ano, seqCompra);
    if (pregaoLocal) {
      this.pregao.set(pregaoLocal);
    }

    // 2. Consulta a API oficial do PNCP para dados aprofundados do Edital/Compra
    this.pncpService.consultarDetalhesCompra(cnpj, ano, seqCompra).subscribe({
      next: (detalhe) => {
        this.detalheCompra.set(detalhe);
        this.carregando.set(false);

        // Se não tínhamos pregao no cache, geramos uma estrutura básica com os dados da compra
        if (!this.pregao() && detalhe) {
          const pregaoConstruido: PregaoAgrupado = {
            chavePregao: `${cnpj}_${ano}_${seqCompra}`,
            cnpj,
            cnpjFormatado: this.formatarCnpj(cnpj),
            ano: Number(ano),
            seqCompra,
            nomeOrgao: detalhe.orgaoEntidade?.razaoSocial || 'Órgão Federal',
            unidadeNome: detalhe.unidadeOrgao?.nomeUnidade,
            uf: detalhe.unidadeOrgao?.ufSigla,
            municipio: detalhe.unidadeOrgao?.municipioNome,
            esfera: 'Federal',
            modalidadeNome: detalhe.modalidadeNome || 'Pregão - Eletrônico',
            linkPregaoPncp: `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seqCompra}`,
            objetoResumido: detalhe.objetoCompra || 'Objeto não informado',
            dataPublicacao: detalhe.dataPublicacaoPncp,
            totalAtas: 0,
            totalAtasVigentes: 0,
            atas: []
          };
          this.pregao.set(pregaoConstruido);
        }

        // Se as atas não vieram do cache inicial, busca diretamente na API oficial de Atas
        if (!this.pregao()?.atas?.length) {
          this.carregarAtasEdital(cnpj, ano, seqCompra);
        }

        // Fase 2: Carrega os itens automaticamente
        this.carregarItensEdital(cnpj, ano, seqCompra);
      },
      error: (err) => {
        console.error('Erro ao consultar detalhes da compra:', err);
        this.carregando.set(false);
        if (!this.pregao()) {
          this.erro.set('Não foi possível carregar as informações deste edital no PNCP.');
        }
        if (!this.pregao()?.atas?.length) {
          this.carregarAtasEdital(cnpj, ano, seqCompra);
        }
        this.carregarItensEdital(cnpj, ano, seqCompra);
      }
    });
  }

  carregarAtasEdital(cnpj: string, ano: string, seqCompra: string) {
    this.pncpService.consultarAtasDaCompra(cnpj, ano, seqCompra).subscribe({
      next: (atas) => {
        if (atas && atas.length > 0) {
          const atual = this.pregao();
          if (atual) {
            const vigentes = atas.filter(a => a.isVigente).length;
            this.pregao.set({
              ...atual,
              atas,
              atasFiltradas: atas.filter(a => a.isVigente && a.permiteAdesao),
              totalAtas: atas.length,
              totalAtasVigentes: vigentes
            });
          }
        }
      }
    });
  }

  carregarItensEdital(cnpj: string, ano: string, seqCompra: string) {
    this.carregandoItens.set(true);
    this.pncpService.consultarItensCompra(cnpj, ano, seqCompra).subscribe({
      next: (itens) => {
        this.itensCompra.set(itens);
        this.carregandoItens.set(false);
      },
      error: (err) => {
        console.warn('Falha ao carregar itens do edital:', err);
        this.carregandoItens.set(false);
      }
    });
  }

  limparFiltroItens() {
    this.termoBuscaItens.set('');
    this.filtroSituacaoItem.set('todos');
    this.paginaItensAtual.set(1);
  }

  mudarPaginaItens(delta: number) {
    const nova = this.paginaItensAtual() + delta;
    if (nova >= 1 && nova <= this.totalPaginasItens()) {
      this.paginaItensAtual.set(nova);
    }
  }

  mudarPaginaAtas(delta: number) {
    const nova = this.paginaAtasAtual() + delta;
    if (nova >= 1 && nova <= this.totalPaginasAtas()) {
      this.paginaAtasAtual.set(nova);
    }
  }

  definirItensPorPagina(qtd: number) {
    this.itensPorPagina.set(qtd);
    this.paginaItensAtual.set(1);
  }

  definirAtasPorPagina(qtd: number) {
    this.atasPorPagina.set(qtd);
    this.paginaAtasAtual.set(1);
  }

  toggleSecaoItens() {
    this.secaoItensRecolhida.update(v => !v);
  }

  toggleSecaoAtas() {
    this.secaoAtasRecolhida.update(v => !v);
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  obterIdsAtas(): string[] {
    const p = this.pregao();
    return p ? (p.atasFiltradas || p.atas).map(a => a.id) : [];
  }

  copiarTexto(texto: string, label: string) {
    navigator.clipboard.writeText(texto).then(() => {
      this.feedbackCopiado.set(`${label} copiado!`);
      setTimeout(() => this.feedbackCopiado.set(null), 2500);
    });
  }

  formatarCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}
