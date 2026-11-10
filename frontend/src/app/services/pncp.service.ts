import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, from, concatMap, delay, switchMap, retry, toArray } from 'rxjs';
import { PncpAtaSearchItem, PncpSearchResponse, PregaoAgrupado, AtaVinculada, DetalheCompraPncp, ItemCompraPncp, AtaPncpCompraDTO, ArquivoPublicacaoPncp } from '../models/pncp.models';

@Injectable({
  providedIn: 'root'
})
export class PncpService {
  private http: HttpClient;
  private readonly BASE_SEARCH_URL = 'https://pncp.gov.br/api/search/';
  private readonly BASE_CONSULTA_URL = 'https://pncp.gov.br/api/consulta/v1/';
  private readonly BASE_PNCP_URL = 'https://pncp.gov.br/api/pncp/v1/';

  // Cache em memória de compras e atas carregadas para navegação instantânea
  private pregoesArmazenados: PregaoAgrupado[] = [];
  private comprasDetalheCache = new Map<string, DetalheCompraPncp>();
  private itensCompraCache = new Map<string, ItemCompraPncp[]>();
  private atasCompraCache = new Map<string, AtaVinculada[]>();

  constructor(http?: HttpClient) {
    this.http = http ?? inject(HttpClient);
  }

  salvarPregoesCache(pregoes: PregaoAgrupado[]) {
    this.pregoesArmazenados = pregoes;
  }

  obterTodosPregoesCache(): PregaoAgrupado[] {
    return this.pregoesArmazenados;
  }

  obterPregaoCache(cnpj: string, ano: number | string, seqCompra: string): PregaoAgrupado | undefined {
    const chave = `${cnpj}_${ano}_${seqCompra}`;
    return this.pregoesArmazenados.find(p => p.chavePregao === chave || (p.cnpj === cnpj && String(p.ano) === String(ano) && String(p.seqCompra) === String(seqCompra)));
  }

  obterAtaCache(cnpj: string, ano: number | string, seqCompra: string, seqAta: string): { pregao?: PregaoAgrupado; ata?: AtaVinculada } {
    const pregao = this.obterPregaoCache(cnpj, ano, seqCompra);
    if (!pregao) return {};
    const ata = pregao.atas.find(a => String(a.seqAta) === String(seqAta) || a.id.endsWith(`_${seqAta}`));
    return { pregao, ata };
  }

  consultarDetalhesCompra(cnpj: string, ano: number | string, sequencial: string | number): Observable<DetalheCompraPncp | null> {
    const cacheKey = `${cnpj}_${ano}_${sequencial}`;
    if (this.comprasDetalheCache.has(cacheKey)) {
      return of(this.comprasDetalheCache.get(cacheKey)!);
    }

    const url = `${this.BASE_CONSULTA_URL}orgaos/${cnpj}/compras/${ano}/${sequencial}`;
    return this.http.get<DetalheCompraPncp>(url).pipe(
      map(res => {
        this.comprasDetalheCache.set(cacheKey, res);
        return res;
      }),
      catchError(err => {
        console.warn(`Não foi possível obter detalhes da compra ${cnpj}/${ano}/${sequencial} via API de consulta:`, err);
        return of(null);
      })
    );
  }

  /**
   * Fase 2: Consulta os itens e produtos licitados no edital (/itens).
   * Suporta cache local em memória para navegação instantânea.
   */
  consultarItensCompra(cnpj: string, ano: number | string, sequencial: string | number): Observable<ItemCompraPncp[]> {
    const cacheKey = `${cnpj}_${ano}_${sequencial}`;
    if (this.itensCompraCache.has(cacheKey)) {
      return of(this.itensCompraCache.get(cacheKey)!);
    }

    // Passamos tamanhoPagina=500 para trazer todos os itens do pregão/ata (o padrão do PNCP limita a 10)
    const url = `${this.BASE_PNCP_URL}orgaos/${cnpj}/compras/${ano}/${sequencial}/itens?tamanhoPagina=500`;
    return this.http.get<ItemCompraPncp[]>(url).pipe(
      map(res => {
        const itens = Array.isArray(res) ? res : [];
        this.itensCompraCache.set(cacheKey, itens);
        return itens;
      }),
      catchError(err => {
        console.warn(`Não foi possível carregar os itens da compra ${cnpj}/${ano}/${sequencial}:`, err);
        return of([]);
      })
    );
  }

  /**
   * Consulta os dados detalhados de uma Ata individual pelo endpoint:
   * GET /api/pncp/v1/orgaos/{cnpj}/compras/{anoCompra}/{sequencialCompra}/atas/{sequencialAta}
   */
  consultarAtaIndividual(cnpj: string, ano: number | string, seqCompra: string | number, seqAta: string | number): Observable<AtaVinculada | null> {
    const url = `${this.BASE_PNCP_URL}orgaos/${cnpj}/compras/${ano}/${seqCompra}/atas/${seqAta}`;
    return this.http.get<AtaPncpCompraDTO>(url).pipe(
      map(item => {
        if (!item) return null;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let isVigente = false;
        let diasRestantes: number | undefined;
        let statusVigencia: AtaVinculada['statusVigencia'] = 'desconhecido';

        if (item.dataVigenciaFim) {
          const dataFim = new Date(item.dataVigenciaFim);
          if (!isNaN(dataFim.getTime())) {
            dataFim.setHours(23, 59, 59, 999);
            const diffMs = dataFim.getTime() - hoje.getTime();
            diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            isVigente = diasRestantes >= 0;
            if (!isVigente) statusVigencia = 'expirada';
            else if (diasRestantes <= 45) statusVigencia = 'prestes-a-vencer';
            else statusVigencia = 'vigente';
          }
        }

        const numAta = item.numeroAtaRegistroPreco || String(seqAta);
        const anoAta = item.anoAta || Number(ano);
        const chavePregao = `${cnpj}_${ano}_${seqCompra}`;

        return {
          id: `${chavePregao}_${seqAta}`,
          titulo: `Ata de Registro de Preços nº ${numAta}/${anoAta}`,
          numeroAta: numAta,
          ano: anoAta,
          seqAta: String(seqAta),
          urlAtaPncp: `https://pncp.gov.br/app/atas/${cnpj}/${ano}/${seqCompra}/${seqAta}`,
          objeto: item.objetoCompra || item.informacaoComplementarCompra || 'Objeto da Ata de Registro de Preços',
          dataAssinatura: item.dataAssinatura,
          vigenciaInicio: item.dataVigenciaInicio,
          vigenciaFim: item.dataVigenciaFim,
          isVigente,
          diasRestantes,
          statusVigencia,
          permiteAdesao: item.possibilidadeAdesao !== false
        } as AtaVinculada;
      }),
      catchError(err => {
        console.warn(`Não foi possível buscar a ata individual ${cnpj}/${ano}/${seqCompra}/${seqAta}:`, err);
        return of(null);
      })
    );
  }
  consultarArquivosCompra(cnpj: string, ano: number | string, seqCompra: string | number): Observable<ArquivoPublicacaoPncp[]> {
    const url = `${this.BASE_PNCP_URL}orgaos/${cnpj}/compras/${ano}/${seqCompra}/arquivos`;
    return this.http.get<ArquivoPublicacaoPncp[]>(url).pipe(
      map(res => Array.isArray(res) ? res : []),
      catchError(err => {
        console.warn(`Não foi possível carregar os arquivos da compra ${cnpj}/${ano}/${seqCompra}:`, err);
        return of([]);
      })
    );
  }

  consultarArquivosAta(cnpj: string, ano: number | string, seqCompra: string | number, seqAta: string | number): Observable<ArquivoPublicacaoPncp[]> {
    const url = `${this.BASE_PNCP_URL}orgaos/${cnpj}/compras/${ano}/${seqCompra}/atas/${seqAta}/arquivos`;
    return this.http.get<ArquivoPublicacaoPncp[]>(url).pipe(
      map(res => Array.isArray(res) ? res : []),
      catchError(() => of([]))
    );
  }

  consultarAtasDaCompra(cnpj: string, ano: number | string, sequencial: string | number): Observable<AtaVinculada[]> {
    const cacheKey = `${cnpj}_${ano}_${sequencial}`;
    if (this.atasCompraCache.has(cacheKey)) {
      return of(this.atasCompraCache.get(cacheKey)!);
    }

    const url = `${this.BASE_PNCP_URL}orgaos/${cnpj}/compras/${ano}/${sequencial}/atas`;
    return this.http.get<{ data?: AtaPncpCompraDTO[] } | AtaPncpCompraDTO[]>(url).pipe(
      map(res => {
        const listaBruta = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const atas = listaBruta.map((item, idx) => {
          const seqAta = item.sequencialAta !== undefined ? String(item.sequencialAta) : String(idx + 1);
          const anoAta = item.anoAta || Number(ano);
          const numAta = item.numeroAtaRegistroPreco || seqAta;
          const chavePregao = `${cnpj}_${ano}_${sequencial}`;

          let isVigente = false;
          let diasRestantes: number | undefined;
          let statusVigencia: AtaVinculada['statusVigencia'] = 'desconhecido';

          if (item.dataVigenciaFim) {
            const dataFim = new Date(item.dataVigenciaFim);
            if (!isNaN(dataFim.getTime())) {
              dataFim.setHours(23, 59, 59, 999);
              const diffMs = dataFim.getTime() - hoje.getTime();
              diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              isVigente = diasRestantes >= 0;
              if (!isVigente) statusVigencia = 'expirada';
              else if (diasRestantes <= 45) statusVigencia = 'prestes-a-vencer';
              else statusVigencia = 'vigente';
            }
          }

          const ata: AtaVinculada = {
            id: `${chavePregao}_${seqAta}`,
            titulo: `Ata nº ${numAta}/${anoAta}`,
            numeroAta: numAta,
            ano: anoAta,
            seqAta,
            urlAtaPncp: `https://pncp.gov.br/app/atas/${cnpj}/${ano}/${sequencial}/${seqAta}`,
            objeto: item.objetoCompra || item.informacaoComplementarCompra || 'Objeto da Ata de Registro de Preços',
            dataAssinatura: item.dataAssinatura,
            vigenciaInicio: item.dataVigenciaInicio,
            vigenciaFim: item.dataVigenciaFim,
            isVigente,
            diasRestantes,
            statusVigencia,
            permiteAdesao: item.possibilidadeAdesao !== false
          };
          return ata;
        });

        this.atasCompraCache.set(cacheKey, atas);
        return atas;
      }),
      catchError(err => {
        console.warn(`Não foi possível carregar atas do edital ${cnpj}/${ano}/${sequencial}:`, err);
        return of([]);
      })
    );
  }

  buscarAtas(
    termo: string,
    pagina: number = 1,
    tamPagina: number = 20,
    dataInicial?: string,
    dataFinal?: string,
    uf?: string
  ): Observable<PncpSearchResponse> {
    const termoTratado = (termo || '').trim();
    const params: Record<string, string | number> = {
      q: termoTratado,
      tipos_documento: 'ata',
      esferas: 'F',               // Filtro PNCP: Esfera Federal
      modalidades: '6',           // Filtro PNCP: Pregão - Eletrônico
      pagina: pagina,
      tam_pagina: tamPagina,
      ordenacao: '-data'
    };

    // Se a busca for ampla (sem termo específico), a API do PNCP exige o parâmetro status
    if (!termoTratado) {
      params['status'] = 'todas';
    }

    if (uf) {
      params['ufs'] = uf.trim().toUpperCase();
    }
    if (dataInicial) {
      params['data_inicial'] = dataInicial.replace(/-/g, '');
    }
    if (dataFinal) {
      params['data_final'] = dataFinal.replace(/-/g, '');
    }

    return this.http.get<PncpSearchResponse>(this.BASE_SEARCH_URL, { params });
  }

  /**
   * Busca sequencial com espaçamento de tempo (throttling + jitter) e retry automático
   * para contornar rate-limits (HTTP 429/500/Drop de conexão) do PNCP.
   */
  buscarMultiplasPaginas(
    termo: string,
    totalPaginas: number = 5,
    dataInicial?: string,
    dataFinal?: string,
    uf?: string,
    onProgresso?: (progresso: { atual: number; total: number; itensCarregados: number }) => void
  ): Observable<PncpAtaSearchItem[]> {
    const termoTratado = (termo || '').trim();
    const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);
    const todosItens: PncpAtaSearchItem[] = [];

    return from(paginas).pipe(
      concatMap((pagina, index) => {
        // Delay suave de 220ms entre páginas (com pequeno jitter aleatório) para não acionar o WAF do PNCP
        const delayMs = index === 0 ? 0 : 220 + Math.floor(Math.random() * 80);

        return of(null).pipe(
          delay(delayMs),
          switchMap(() => this.buscarAtas(termoTratado, pagina, 20, dataInicial, dataFinal, uf)),
          retry({
            count: 2,
            delay: 450 // se falhar/cair a conexão, tenta novamente após 450ms
          }),
          catchError((err) => {
            console.warn(`Página ${pagina} ignorada devido a rate-limit ou timeout:`, err);
            return of({ items: [], total: 0 });
          }),
          map(res => {
            const items = res?.items || [];
            todosItens.push(...items);
            if (onProgresso) {
              onProgresso({
                atual: pagina,
                total: totalPaginas,
                itensCarregados: todosItens.length
              });
            }
            return items;
          })
        );
      }),
      toArray(),
      map(() => todosItens)
    );
  }

  agruparPorPregao(itens: PncpAtaSearchItem[], apenasEsferaFederal: boolean = true): PregaoAgrupado[] {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const mapPregoes = new Map<string, PregaoAgrupado>();

    for (const item of itens) {
      // 1. REGRA: Apenas Esfera Federal
      const esferaId = (item.esfera_id || '').toUpperCase();
      const esferaNome = (item.esfera_nome || '').toLowerCase();
      const isFederal = esferaId === 'F' || esferaNome.includes('federal');

      if (apenasEsferaFederal && !isFederal) {
        continue;
      }

      const cnpjBruto = (item.orgao_cnpj || '').replace(/\D/g, '');
      let ano = Number(item.ano) || hoje.getFullYear();

      let seqCompra = item.numero_sequencial_compra_ata !== undefined && item.numero_sequencial_compra_ata !== null
        ? String(item.numero_sequencial_compra_ata)
        : '';
      let seqAta = item.numero_sequencial !== undefined && item.numero_sequencial !== null
        ? String(item.numero_sequencial)
        : '1';

      let urlAtaWeb = '';
      if (item.item_url) {
        urlAtaWeb = item.item_url.startsWith('http')
          ? item.item_url
          : `https://pncp.gov.br/app${item.item_url.startsWith('/') ? '' : '/'}${item.item_url}`;

        // Exemplo: /atas/29507878000108/2025/30/1
        // Formato: /atas/{cnpj}/{anoCompra}/{seqCompra}/{seqAta}
        const matchAta = item.item_url.match(/\/atas\/(\d+)\/(\d+)\/(\d+)\/(\d+)/);
        if (matchAta) {
          ano = Number(matchAta[2]); // Extrai o anoCompra real da URL da ata
          seqCompra = matchAta[3];
          seqAta = matchAta[4];
        }
      } else if (cnpjBruto && ano && seqCompra) {
        urlAtaWeb = `https://pncp.gov.br/app/atas/${cnpjBruto}/${ano}/${seqCompra}/${seqAta}`;
      }

      if (!cnpjBruto || !ano || !seqCompra) {
        continue;
      }

      const chavePregao = `${cnpjBruto}_${ano}_${seqCompra}`;
      const linkPregaoWeb = `https://pncp.gov.br/app/editais/${cnpjBruto}/${ano}/${seqCompra}`;

      // Cálculo de vigência com base em data_fim_vigencia
      let isVigente = false;
      let diasRestantes: number | undefined;
      let statusVigencia: AtaVinculada['statusVigencia'] = 'desconhecido';

      const dataFimStr = item.data_fim_vigencia;
      if (dataFimStr) {
        const dataFim = new Date(dataFimStr);
        if (!isNaN(dataFim.getTime())) {
          dataFim.setHours(23, 59, 59, 999);
          const diffMs = dataFim.getTime() - hoje.getTime();
          diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          isVigente = diasRestantes >= 0;

          if (!isVigente) {
            statusVigencia = 'expirada';
          } else if (diasRestantes <= 45) {
            statusVigencia = 'prestes-a-vencer';
          } else {
            statusVigencia = 'vigente';
          }
        }
      }

      const ataVinculada: AtaVinculada = {
        id: item.id || `${chavePregao}_${seqAta}`,
        titulo: item.title || `Ata nº ${item.numero || seqAta}/${ano}`,
        numeroAta: item.numero ? String(item.numero) : (item.title || seqAta),
        ano: ano,
        seqAta: seqAta,
        urlAtaPncp: urlAtaWeb,
        objeto: item.description || 'Objeto não informado',
        dataAssinatura: item.data_assinatura,
        vigenciaInicio: item.data_inicio_vigencia,
        vigenciaFim: item.data_fim_vigencia,
        isVigente,
        diasRestantes,
        statusVigencia,
        permiteAdesao: item.permite_adesao !== false,
        fornecedorNome: item.fornecedor_nome || undefined,
        fornecedorNi: item.fornecedor_ni || undefined,
        valorTotal: item.valor_global || undefined,
        rawItem: item
      };

      if (!mapPregoes.has(chavePregao)) {
        mapPregoes.set(chavePregao, {
          chavePregao,
          cnpj: cnpjBruto,
          cnpjFormatado: this.formatarCnpj(cnpjBruto),
          ano,
          seqCompra,
          nomeOrgao: item.orgao_nome || 'Órgão Desconhecido',
          unidadeNome: item.unidade_nome || undefined,
          uf: item.uf,
          municipio: item.municipio_nome,
          esfera: 'Federal',
          modalidadeNome: item.modalidade_licitacao_nome || 'Pregão - Eletrônico',
          linkPregaoPncp: linkPregaoWeb,
          objetoResumido: item.description || 'Aquisição de bens/serviços',
          dataPublicacao: item.data_publicacao_pncp,
          dataAssinatura: item.data_assinatura,
          maiorDiasVigencia: diasRestantes || 0,
          totalAtas: 0,
          totalAtasVigentes: 0,
          atas: [],
          expandido: false
        });
      }

      const pregao = mapPregoes.get(chavePregao)!;
      // Atualiza maior dias de vigência do edital
      if (diasRestantes && diasRestantes > (pregao.maiorDiasVigencia || 0)) {
        pregao.maiorDiasVigencia = diasRestantes;
      }
      if (!pregao.dataPublicacao && item.data_publicacao_pncp) {
        pregao.dataPublicacao = item.data_publicacao_pncp;
      }

      // Evita duplicatas da mesma ata
      if (!pregao.atas.some(a => a.seqAta === ataVinculada.seqAta && a.id === ataVinculada.id)) {
        pregao.atas.push(ataVinculada);
        pregao.totalAtas++;
        if (ataVinculada.isVigente) {
          pregao.totalAtasVigentes++;
        }
      }
    }

    return Array.from(mapPregoes.values()).sort((a, b) => b.totalAtasVigentes - a.totalAtasVigentes);
  }

  private formatarCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}
