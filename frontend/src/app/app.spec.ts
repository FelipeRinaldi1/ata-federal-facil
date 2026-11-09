import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './app';
import { PncpService } from './services/pncp.service';
import { StatusAnaliseService } from './services/status-analise.service';
import { ThemeService } from './services/theme.service';

describe('App Component (Testes Unitários & Reatividade de Sinais)', () => {
  let fakeService: any;
  let statusService: StatusAnaliseService;
  let themeService: ThemeService;
  let app: App;

  beforeEach(() => {
    localStorage.clear();
    fakeService = {
      buscarMultiplasPaginas: vi.fn(),
      agruparPorPregao: vi.fn()
    };
    statusService = new StatusAnaliseService();
    themeService = new ThemeService();
    app = new App(fakeService, statusService, themeService);
  });

  it('deve inicializar com busca padrao e apenas atas vigentes e com adesao permitida', () => {
    expect(app.termoBusca()).toBe('mobiliário');
    expect(app.filtroOrgao()).toBe('');
    expect(app.filtroStatusAnalise()).toBe('todos');
  });

  it('deve filtrar por Status de Análise (pendente, em-analise, analisado)', () => {
    app.todosPregoes.set([
      {
        chavePregao: 'p1',
        cnpj: '111',
        cnpjFormatado: '111',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'IF 1',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'a1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata 1', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      },
      {
        chavePregao: 'p2',
        cnpj: '222',
        cnpjFormatado: '222',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'IF 2',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'a2', isVigente: true, permiteAdesao: true, seqAta: '2', titulo: 'Ata 2', numeroAta: '2', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      }
    ]);

    // Inicialmente ambos estão 'pendente'
    expect(app.pregoesFiltrados().length).toBe(2);

    // Marca p1 como analisado
    statusService.toggleAta('a1');

    // Filtrar apenas 'analisado' (Visto)
    app.filtroStatusAnalise.set('analisado');
    expect(app.pregoesFiltrados().length).toBe(1);
    expect(app.pregoesFiltrados()[0].chavePregao).toBe('p1');

    // Filtrar apenas 'pendente' (Não visto)
    app.filtroStatusAnalise.set('pendente');
    expect(app.pregoesFiltrados().length).toBe(1);
    expect(app.pregoesFiltrados()[0].chavePregao).toBe('p2');
  });

  it('deve ordenar editais por Maior Vigência, Órgão A-Z e Mais Recente', () => {
    app.todosPregoes.set([
      {
        chavePregao: 'b',
        cnpj: '222',
        cnpjFormatado: '222',
        ano: 2025,
        seqCompra: '1',
        nomeOrgao: 'Universidade Federal de Minas Gerais',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        dataPublicacao: '2025-01-01',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'b1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata B', numeroAta: '1', ano: 2025, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente', diasRestantes: 50 }]
      },
      {
        chavePregao: 'a',
        cnpj: '111',
        cnpjFormatado: '111',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'Instituto Federal de São Paulo',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        dataPublicacao: '2026-06-01',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'a1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata A', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente', diasRestantes: 300 }]
      }
    ]);

    // 1. Maior Vigência (deve vir primeiro 'a' com 300 dias)
    app.ordenacao.set('maior-vigencia');
    expect(app.pregoesFiltrados()[0].chavePregao).toBe('a');

    // 2. Órgão A-Z (Instituto Federal 'a' antes de Universidade Federal 'b')
    app.ordenacao.set('orgao-az');
    expect(app.pregoesFiltrados()[0].chavePregao).toBe('a');

    // 3. Mais Recente (ano 2026 'a' antes de 2025 'b')
    app.ordenacao.set('mais-recente');
    expect(app.pregoesFiltrados()[0].chavePregao).toBe('a');
  });

  it('deve filtrar reativamente pregões com base no nome do Órgão (filtroOrgao)', () => {
    app.todosPregoes.set([
      {
        chavePregao: '1',
        cnpj: '10767658000186',
        cnpjFormatado: '10.767.658/0001-86',
        ano: 2026,
        seqCompra: '10',
        nomeOrgao: 'INSTITUTO FEDERAL DE SAO PAULO',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: 'Mobiliário',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'a1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata 1', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      },
      {
        chavePregao: '2',
        cnpj: '04071106000137',
        cnpjFormatado: '04.071.106/0001-37',
        ano: 2026,
        seqCompra: '27',
        nomeOrgao: 'UNIVERSIDADE FEDERAL DO ACRE',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: 'Mobiliário',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'a2', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata 2', numeroAta: '2', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      }
    ]);

    // Sem filtro de órgão
    app.filtroOrgao.set('');
    expect(app.pregoesFiltrados().length).toBe(2);

    // Filtrando por "Instituto Federal"
    app.filtroOrgao.set('Instituto Federal');
    const filtradosIF = app.pregoesFiltrados();
    expect(filtradosIF.length).toBe(1);
    expect(filtradosIF[0].nomeOrgao).toContain('INSTITUTO FEDERAL');

    // Filtrando por CNPJ
    app.filtroOrgao.set('04071106000137');
    const filtradosCNPJ = app.pregoesFiltrados();
    expect(filtradosCNPJ.length).toBe(1);
    expect(filtradosCNPJ[0].nomeOrgao).toContain('UNIVERSIDADE FEDERAL DO ACRE');
  });

  it('deve ocultar pregões que não possuem atas vigentes e com adesão permitida', () => {
    app.filtroOrgao.set('');

    app.todosPregoes.set([
      {
        chavePregao: 'vencido',
        cnpj: '111',
        cnpjFormatado: '111',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'IF Vencido',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 0,
        atas: [{ id: 'v1', isVigente: false, permiteAdesao: true, seqAta: '1', titulo: 'Ata', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'expirada' }]
      },
      {
        chavePregao: 'sem-adesao',
        cnpj: '222',
        cnpjFormatado: '222',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'IF Sem Carona',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: 'v2', isVigente: true, permiteAdesao: false, seqAta: '2', titulo: 'Ata 2', numeroAta: '2', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      }
    ]);

    // Ambos devem ser descartados: um por estar vencido, outro por vedar adesão
    expect(app.pregoesFiltrados().length).toBe(0);
  });
});
