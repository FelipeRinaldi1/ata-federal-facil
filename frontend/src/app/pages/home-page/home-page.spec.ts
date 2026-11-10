import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from './home-page';
import { PncpService } from '../../services/pncp.service';
import { StatusAnaliseService } from '../../services/status-analise.service';

describe('HomePage Component (Testes Unitários & Reatividade de Sinais)', () => {
  let fakeService: any;
  let statusService: StatusAnaliseService;
  let homePage: HomePage;

  beforeEach(() => {
    localStorage.clear();
    fakeService = {
      buscarMultiplasPaginas: vi.fn(),
      agruparPorPregao: vi.fn(),
      salvarPregoesCache: vi.fn()
    };
    statusService = new StatusAnaliseService();
    homePage = new HomePage(fakeService, statusService);
  });

  it('deve inicializar com busca padrao vazia e filtros zerados', () => {
    expect(homePage.termoBusca()).toBe('');
    expect(homePage.filtroOrgao()).toBe('');
    expect(homePage.filtroStatusAnalise()).toBe('todos');
  });

  it('deve filtrar por Status de Análise (pendente, em-analise, analisado)', () => {
    homePage.todosPregoes.set([
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
        atas: [{ id: 'a2', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata 2', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      }
    ]);

    // Marcar ata a1 como analisada
    statusService.toggleAta('a1', 'p1');

    // Filtro: apenas analisados (visto)
    homePage.filtroStatusAnalise.set('analisado');
    let filtrados = homePage.pregoesFiltrados();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].chavePregao).toBe('p1');

    // Filtro: não vistos (pendente)
    homePage.filtroStatusAnalise.set('pendente');
    filtrados = homePage.pregoesFiltrados();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].chavePregao).toBe('p2');

    // Filtro: todos
    homePage.filtroStatusAnalise.set('todos');
    filtrados = homePage.pregoesFiltrados();
    expect(filtrados.length).toBe(2);
  });

  it('deve ordenar editais por Maior Vigência, Órgão A-Z e Mais Recente', () => {
    homePage.todosPregoes.set([
      {
        chavePregao: 'b',
        cnpj: '222',
        cnpjFormatado: '222',
        ano: 2025,
        seqCompra: '10',
        nomeOrgao: 'Universidade B',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        dataPublicacao: '2025-01-01',
        atas: [{ id: 'ab', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata B', numeroAta: '1', ano: 2025, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente', diasRestantes: 50 }]
      },
      {
        chavePregao: 'a',
        cnpj: '111',
        cnpjFormatado: '111',
        ano: 2026,
        seqCompra: '5',
        nomeOrgao: 'Instituto A',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        dataPublicacao: '2026-02-01',
        atas: [{ id: 'aa', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata A', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente', diasRestantes: 200 }]
      }
    ]);

    // 1. Maior vigência (A tem 200 dias > B tem 50 dias)
    homePage.ordenacao.set('maior-vigencia');
    let lista = homePage.pregoesFiltrados();
    expect(lista[0].chavePregao).toBe('a');
    expect(lista[1].chavePregao).toBe('b');

    // 2. Órgão A-Z (Instituto A vem antes de Universidade B)
    homePage.ordenacao.set('orgao-az');
    lista = homePage.pregoesFiltrados();
    expect(lista[0].nomeOrgao).toBe('Instituto A');

    // 3. Mais Recente (ano 2026 antes de 2025)
    homePage.ordenacao.set('mais-recente');
    lista = homePage.pregoesFiltrados();
    expect(lista[0].chavePregao).toBe('a');
  });

  it('deve filtrar reativamente pregões com base no nome do Órgão (filtroOrgao)', () => {
    homePage.todosPregoes.set([
      {
        chavePregao: '1',
        cnpj: '10767658000186',
        cnpjFormatado: '10.767.658/0001-86',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'INSTITUTO FEDERAL DE SAO PAULO',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: '1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      },
      {
        chavePregao: '2',
        cnpj: '24365710000183',
        cnpjFormatado: '24.365.710/0001-83',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'UNIVERSIDADE FEDERAL DE MINAS GERAIS',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [{ id: '2', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }]
      }
    ]);

    homePage.filtroOrgao.set('minas');
    expect(homePage.pregoesFiltrados().length).toBe(1);
    expect(homePage.pregoesFiltrados()[0].nomeOrgao).toContain('MINAS GERAIS');

    // Busca por CNPJ
    homePage.filtroOrgao.set('10.767.658');
    expect(homePage.pregoesFiltrados().length).toBe(1);
    expect(homePage.pregoesFiltrados()[0].nomeOrgao).toContain('SAO PAULO');
  });

  it('deve ocultar pregões que não possuem atas vigentes e com adesão permitida', () => {
    homePage.filtroOrgao.set('');

    homePage.todosPregoes.set([
      {
        chavePregao: 'valido',
        cnpj: '111',
        cnpjFormatado: '111',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'Órgão Válido',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [
          { id: '1', isVigente: true, permiteAdesao: true, seqAta: '1', titulo: 'Ata', numeroAta: '1', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }
        ]
      },
      {
        chavePregao: 'invalido-expirado',
        cnpj: '222',
        cnpjFormatado: '222',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'Órgão Expirado',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 0,
        atas: [
          { id: '2', isVigente: false, permiteAdesao: true, seqAta: '2', titulo: 'Ata', numeroAta: '2', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'expirada' }
        ]
      },
      {
        chavePregao: 'invalido-sem-carona',
        cnpj: '333',
        cnpjFormatado: '333',
        ano: 2026,
        seqCompra: '3',
        nomeOrgao: 'Órgão Veda Carona',
        esfera: 'Federal',
        linkPregaoPncp: '',
        objetoResumido: '',
        totalAtas: 1,
        totalAtasVigentes: 1,
        atas: [
          { id: '3', isVigente: true, permiteAdesao: false, seqAta: '3', titulo: 'Ata', numeroAta: '3', ano: 2026, urlAtaPncp: '', objeto: '', statusVigencia: 'vigente' }
        ]
      }
    ]);

    const resultado = homePage.pregoesFiltrados();
    expect(resultado.length).toBe(1);
    expect(resultado[0].chavePregao).toBe('valido');
  });

  it('deve destacar termos no texto em negrito sem adicionar estilos chamativos', () => {
    const texto = 'Contratação de empresa para fornecimento de cadeiras estofadas';
    const termo = 'cadeiras';
    const resultado = homePage.destacarTermo(texto, termo);
    expect(resultado).toContain('<strong class="font-bold text-neutral-900 dark:text-neutral-100">cadeiras</strong>');
  });

  it('deve escapar tags html maliciosas no destacarTermo', () => {
    const perigoso = '<script>alert("xss")</script> e mesa';
    const termo = 'mesa';
    const resultado = homePage.destacarTermo(perigoso, termo);
    expect(resultado).not.toContain('<script>');
    expect(resultado).toContain('&lt;script&gt;');
    expect(resultado).toContain('<strong class="font-bold text-neutral-900 dark:text-neutral-100">mesa</strong>');
  });
});
