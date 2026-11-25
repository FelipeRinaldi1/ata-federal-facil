import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { PncpService } from './pncp.service';
import { PncpAtaSearchItem } from '../models/pncp.models';
import { of, firstValueFrom } from 'rxjs';

describe('PncpService (Testes Unitários & Integração de Dados)', () => {
  const fakeHttp = {
    get: vi.fn()
  };

  const service = new PncpService(fakeHttp as any);

  it('deve filtrar rigorosamente apenas registros da ESFERA FEDERAL', () => {
    const itensMistos: PncpAtaSearchItem[] = [
      {
        id: '1',
        title: 'Ata Federal IF',
        item_url: '/atas/10767658000186/2026/10/1',
        ano: 2026,
        numero_sequencial: 1,
        numero_sequencial_compra_ata: 10,
        orgao_cnpj: '10767658000186',
        orgao_nome: 'INSTITUTO FEDERAL DE SAO PAULO',
        esfera_id: 'F',
        esfera_nome: 'Federal',
        description: 'Mobiliário em geral',
        data_fim_vigencia: '2027-12-31'
      },
      {
        id: '2',
        title: 'Ata Municipal',
        item_url: '/atas/07810468000190/2026/132/1',
        ano: 2026,
        numero_sequencial: 1,
        numero_sequencial_compra_ata: 132,
        orgao_cnpj: '07810468000190',
        orgao_nome: 'MUNICIPIO DE IGUATU',
        esfera_id: 'M',
        esfera_nome: 'Municipal',
        description: 'Mobiliário',
        data_fim_vigencia: '2027-12-31'
      },
      {
        id: '3',
        title: 'Ata Estadual',
        item_url: '/atas/00000000000199/2026/5/1',
        ano: 2026,
        numero_sequencial: 1,
        numero_sequencial_compra_ata: 5,
        orgao_cnpj: '00000000000199',
        orgao_nome: 'SECRETARIA DE ESTADO DE EDUCACAO',
        esfera_id: 'E',
        esfera_nome: 'Estadual',
        description: 'Mobiliário',
        data_fim_vigencia: '2027-12-31'
      }
    ];

    const resultado = service.agruparPorPregao(itensMistos, true);

    expect(resultado.length).toBe(1);
    expect(resultado[0].nomeOrgao).toBe('INSTITUTO FEDERAL DE SAO PAULO');
    expect(resultado[0].esfera).toBe('Federal');
    expect(resultado.some(r => r.nomeOrgao.includes('IGUATU'))).toBe(false);
  });

  it('deve agrupar múltiplas Atas do mesmo Pregão / Edital sob o mesmo card pai', () => {
    const atasMesmoEdital: PncpAtaSearchItem[] = [
      {
        id: 'ata-1',
        title: 'Ata 01/2026 - Lote 1 Cadeiras',
        item_url: '/atas/04071106000137/2026/27/1',
        ano: 2026,
        numero_sequencial: 1,
        numero_sequencial_compra_ata: 27,
        orgao_cnpj: '04071106000137',
        orgao_nome: 'UNIVERSIDADE FEDERAL DO ACRE',
        esfera_id: 'F',
        description: 'Cadeiras anatômicas',
        data_fim_vigencia: '2027-08-01'
      },
      {
        id: 'ata-2',
        title: 'Ata 02/2026 - Lote 2 Mesas',
        item_url: '/atas/04071106000137/2026/27/2',
        ano: 2026,
        numero_sequencial: 2,
        numero_sequencial_compra_ata: 27,
        orgao_cnpj: '04071106000137',
        orgao_nome: 'UNIVERSIDADE FEDERAL DO ACRE',
        esfera_id: 'F',
        description: 'Mesas para laboratório',
        data_fim_vigencia: '2027-08-01'
      }
    ];

    const resultado = service.agruparPorPregao(atasMesmoEdital, true);

    // Deve agrupar em APENAS 1 edital
    expect(resultado.length).toBe(1);
    expect(resultado[0].chavePregao).toBe('04071106000137_2026_27');
    expect(resultado[0].totalAtas).toBe(2);
    expect(resultado[0].atas.length).toBe(2);
  });

  it('deve calcular corretamente a vigência e dias restantes', () => {
    const dataFutura = new Date();
    dataFutura.setDate(dataFutura.getDate() + 90);
    const dataFuturaIso = dataFutura.toISOString().split('T')[0];

    const dataPassada = '2020-01-01';

    const itens: PncpAtaSearchItem[] = [
      {
        id: 'ata-vigente',
        title: 'Ata Vigente',
        item_url: '/atas/12345678000199/2026/1/1',
        ano: 2026,
        numero_sequencial: 1,
        numero_sequencial_compra_ata: 1,
        orgao_cnpj: '12345678000199',
        orgao_nome: 'IFSP',
        esfera_id: 'F',
        data_fim_vigencia: dataFuturaIso
      },
      {
        id: 'ata-vencida',
        title: 'Ata Vencida',
        item_url: '/atas/12345678000199/2026/1/2',
        ano: 2026,
        numero_sequencial: 2,
        numero_sequencial_compra_ata: 1,
        orgao_cnpj: '12345678000199',
        orgao_nome: 'IFSP',
        esfera_id: 'F',
        data_fim_vigencia: dataPassada
      }
    ];

    const resultado = service.agruparPorPregao(itens, true);
    const atas = resultado[0].atas;

    const vigente = atas.find(a => a.id === 'ata-vigente');
    const vencida = atas.find(a => a.id === 'ata-vencida');

    expect(vigente?.isVigente).toBe(true);
    expect(vigente?.statusVigencia).toBe('vigente');
    expect(vigente?.diasRestantes).toBeGreaterThan(0);

    expect(vencida?.isVigente).toBe(false);
    expect(vencida?.statusVigencia).toBe('expirada');
  });

  it('deve realizar busca no endpoint do PNCP com os parâmetros corretos (padrão vigentes e encerradas)', () => {
    fakeHttp.get.mockReturnValue(of({ items: [], total: 0 }));

    service.buscarAtas('mobiliário', 1, 20).subscribe();

    expect(fakeHttp.get).toHaveBeenCalledWith(
      'https://pncp.gov.br/api/search/',
      expect.objectContaining({
        params: {
          q: 'mobiliário',
          tipos_documento: 'ata',
          esferas: 'F',
          modalidades: '6',
          status: 'todos',
          pagina: 1,
          tam_pagina: 20,
          ordenacao: '-data'
        }
      })
    );
  });

  it('deve enviar status correto conforme filtro de vigência (vigentes, encerradas, todas)', () => {
    fakeHttp.get.mockReturnValue(of({ items: [], total: 0 }));

    service.buscarAtas('cadeira', 1, 20, undefined, undefined, undefined, 'vigentes').subscribe();
    expect(fakeHttp.get).toHaveBeenLastCalledWith(
      'https://pncp.gov.br/api/search/',
      expect.objectContaining({
        params: expect.objectContaining({ status: 'vigente' })
      })
    );

    service.buscarAtas('cadeira', 1, 20, undefined, undefined, undefined, 'encerradas').subscribe();
    expect(fakeHttp.get).toHaveBeenLastCalledWith(
      'https://pncp.gov.br/api/search/',
      expect.objectContaining({
        params: expect.objectContaining({ status: 'nao_vigente' })
      })
    );

    service.buscarAtas('cadeira', 1, 20, undefined, undefined, undefined, 'todas').subscribe();
    expect(fakeHttp.get).toHaveBeenLastCalledWith(
      'https://pncp.gov.br/api/search/',
      expect.objectContaining({
        params: expect.objectContaining({ status: 'todos' })
      })
    );
  });

  it('deve enviar parâmetros de data inicial, data final e UF formatados para o PNCP', () => {
    fakeHttp.get.mockReturnValue(of({ items: [], total: 0 }));

    service.buscarAtas('mobiliário', 1, 20, '2025-01-15', '2026-11-09', 'SP').subscribe();

    expect(fakeHttp.get).toHaveBeenCalledWith(
      'https://pncp.gov.br/api/search/',
      expect.objectContaining({
        params: {
          q: 'mobiliário',
          tipos_documento: 'ata',
          esferas: 'F',
          modalidades: '6',
          status: 'todos',
          pagina: 1,
          tam_pagina: 20,
          ordenacao: '-data',
          data_inicial: '20250115',
          data_final: '20261109',
          ufs: 'SP'
        }
      })
    );
  });

  it('deve consultar sugestões de fornecedores no /api/search/suggest removendo pontos e exigindo 3+ caracteres', () => {
    fakeHttp.get.mockClear();

    let curto: any[] = [];
    service.sugerirFornecedores('de').subscribe(r => (curto = r));
    expect(curto).toEqual([]);
    expect(fakeHttp.get).not.toHaveBeenCalled();

    fakeHttp.get.mockReturnValue(
      of({
        items: [
          { id: '183071', ni: '11666105000362', nome: 'DELLAMED S.A. - 11666105000362', total: 16 }
        ]
      })
    );

    let sugestoes: any[] = [];
    service.sugerirFornecedores('11.666.105').subscribe(r => (sugestoes = r));

    expect(fakeHttp.get).toHaveBeenCalledWith(
      'https://pncp.gov.br/api/search/suggest',
      expect.objectContaining({
        params: {
          tipos_documento: 'edital',
          campo: 'fornecedores',
          q: '11666105',
          tam_pagina: 20
        }
      })
    );
    expect(sugestoes.length).toBe(1);
    expect(sugestoes[0].id).toBe('183071');
    expect(sugestoes[0].nome).toBe('DELLAMED S.A.');
    expect(sugestoes[0].ni).toBe('11.666.105/0003-62');
  });

  it('deve buscar pregões federais por fornecedor e carregar suas atas vinculadas', async () => {
    const httpLocal = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url === 'https://pncp.gov.br/api/search/') {
          return of({
            total: 1,
            items: [
              {
                id: 'edital-1',
                title: 'Edital nº 90014/2024',
                description: 'Cadeiras hospitalares',
                item_url: '/compras/15126437000143/2024/323',
                ano: '2024',
                numero_sequencial: '323',
                orgao_cnpj: '15126437000143',
                orgao_nome: 'EBSERH',
                esfera_id: 'F',
                esfera_nome: 'Federal',
                uf: 'ES'
              }
            ]
          });
        }
        return of({
          data: [
            {
              numeroAtaRegistroPreco: '00068',
              anoAta: 2024,
              sequencialAta: 1,
              dataVigenciaInicio: '2024-07-15',
              dataVigenciaFim: '2025-07-15',
              possibilidadeAdesao: true
            }
          ]
        });
      })
    };

    const localService = new PncpService(httpLocal as any);
    const resultado = await firstValueFrom(
      localService.buscarPregoesComAtasPorFornecedor(
        { id: '183071', ni: '11.666.105/0003-62', nome: 'DELLAMED S.A.' },
        '',
        1
      )
    );

    expect(resultado.length).toBe(1);
    expect(resultado[0].chavePregao).toBe('15126437000143_2024_323');
    expect(resultado[0].atas.length).toBe(1);
    expect(resultado[0].atas[0].fornecedorNome).toBe('DELLAMED S.A.');
    expect(resultado[0].atas[0].fornecedorNi).toBe('11.666.105/0003-62');
  });

  it('deve consultar itens da compra no endpoint oficial e utilizar cache', () => {
    const fakeItens = [
      { numeroItem: 1, descricao: 'Cadeira Ergonômica', quantidade: 50, valorUnitarioEstimado: 800 }
    ];
    fakeHttp.get.mockReturnValue(of(fakeItens));

    let itensRetornados: any;
    service.consultarItensCompra('00394460000141', 2024, 1).subscribe(res => {
      itensRetornados = res;
    });

    expect(itensRetornados).toEqual(fakeItens);
    expect(fakeHttp.get).toHaveBeenCalledWith('https://pncp.gov.br/api/pncp/v1/orgaos/00394460000141/compras/2024/1/itens?tamanhoPagina=500');
  });
});
