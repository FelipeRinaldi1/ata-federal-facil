import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError, from, concatMap, delay, switchMap, retry, toArray } from 'rxjs';
import { PncpAtaSearchItem, PncpSearchResponse, PregaoAgrupado, AtaVinculada } from '../models/pncp.models';

@Injectable({
  providedIn: 'root'
})
export class PncpService {
  private http: HttpClient;
  private readonly BASE_SEARCH_URL = 'https://pncp.gov.br/api/search/';

  constructor(http?: HttpClient) {
    this.http = http ?? inject(HttpClient);
  }

  buscarAtas(
    termo: string,
    pagina: number = 1,
    tamPagina: number = 20,
    dataInicial?: string,
    dataFinal?: string,
    uf?: string
  ): Observable<PncpSearchResponse> {
    const params: Record<string, string | number> = {
      q: termo,
      tipos_documento: 'ata',
      esferas: 'F',               // Filtro PNCP: Esfera Federal
      modalidades: '6',           // Filtro PNCP: Pregão - Eletrônico
      pagina: pagina,
      tam_pagina: tamPagina,
      ordenacao: '-data'
    };

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
    if (!termo || !termo.trim()) return of([]);

    const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);
    const todosItens: PncpAtaSearchItem[] = [];

    return from(paginas).pipe(
      concatMap((pagina, index) => {
        // Delay suave de 220ms entre páginas (com pequeno jitter aleatório) para não acionar o WAF do PNCP
        const delayMs = index === 0 ? 0 : 220 + Math.floor(Math.random() * 80);

        return of(null).pipe(
          delay(delayMs),
          switchMap(() => this.buscarAtas(termo, pagina, 20, dataInicial, dataFinal, uf)),
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
      const ano = Number(item.ano) || hoje.getFullYear();

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

        // Exemplo: /atas/04071106000137/2026/27/3
        const matchAta = item.item_url.match(/\/atas\/\d+\/(\d+)\/(\d+)\/(\d+)/);
        if (matchAta) {
          seqCompra = matchAta[2];
          seqAta = matchAta[3];
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
        valorTotal: item.valor_global || undefined
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
