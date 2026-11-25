import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { BuscaProfundaPage } from './busca-profunda-page';

describe('BuscaProfundaPage Component (Varredura e Filtragem de Itens)', () => {
  let fakeService: any;
  let page: BuscaProfundaPage;

  beforeEach(() => {
    fakeService = {
      buscarMultiplasPaginas: vi.fn().mockReturnValue(of([])),
      buscarPregoesComAtasPorFornecedor: vi.fn().mockReturnValue(of([])),
      agruparPorPregao: vi.fn().mockReturnValue([]),
      consultarItensCompra: vi.fn().mockReturnValue(of([]))
    };
    page = new BuscaProfundaPage(fakeService);
  });

  it('deve inicializar com valores padrao de configuracao', () => {
    expect(page.termoObjeto()).toBe('');
    expect(page.termoItem()).toBe('');
    expect(page.filtroVigencia()).toBe('todas');
    expect(page.fornecedorSelecionado()).toBeNull();
    expect(page.totalPaginas()).toBe(5);
    expect(page.dataInicial()).toBe('');
    expect(page.dataFinal()).toBe('');
    expect(page.emExecucao()).toBe(false);
    expect(page.todosItensEncontrados().length).toBe(0);
  });

  it('deve exibir mensagem de erro se tentar iniciar sem objeto, item e fornecedor', () => {
    page.termoObjeto.set('   ');
    page.termoItem.set('');
    page.fornecedorSelecionado.set(null);
    page.iniciarVarredura();
    expect(page.erro()).toContain('Preencha ao menos o Objeto, o Item desejado ou selecione um Fornecedor');
    expect(page.emExecucao()).toBe(false);
  });

  it('deve permitir iniciar varredura informando apenas um Fornecedor', () => {
    const fornecedor = { id: '183071', ni: '11.666.105/0003-62', nome: 'DELLAMED S.A.' };
    page.onFornecedorChange(fornecedor);
    page.iniciarVarredura();

    expect(fakeService.buscarPregoesComAtasPorFornecedor).toHaveBeenCalledWith(
      fornecedor,
      '',
      5,
      undefined,
      undefined,
      undefined,
      expect.any(Function)
    );
  });

  it('deve filtrar reativamente itens por nome do orgao e refino de descricao', () => {
    page.todosItensEncontrados.set([
      {
        numeroItem: 1,
        descricao: 'Cadeira executiva ergonômica',
        quantidade: 10,
        valorTotal: 5000,
        cnpj: '11111111000100',
        cnpjFormatado: '11.111.111/0001-00',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'Instituto Federal de Minas Gerais',
        linkPregaoPncp: 'https://pncp.gov.br/1'
      },
      {
        numeroItem: 2,
        descricao: 'Mesa de escritório em L',
        quantidade: 5,
        valorTotal: 4000,
        cnpj: '22222222000100',
        cnpjFormatado: '22.222.222/0001-00',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'Universidade Federal do Pará',
        linkPregaoPncp: 'https://pncp.gov.br/2'
      }
    ]);

    // Sem filtros locais
    expect(page.itensFiltrados().length).toBe(2);

    // Filtro por órgão
    page.filtroTabelaOrgao.set('Minas Gerais');
    expect(page.itensFiltrados().length).toBe(1);
    expect(page.itensFiltrados()[0].nomeOrgao).toBe('Instituto Federal de Minas Gerais');

    // Filtro por descrição
    page.filtroTabelaOrgao.set('');
    page.filtroTabelaDescricao.set('Mesa');
    expect(page.itensFiltrados().length).toBe(1);
    expect(page.itensFiltrados()[0].descricao).toBe('Mesa de escritório em L');
  });

  it('deve ordenar itens por valor total e por numero do item', () => {
    page.todosItensEncontrados.set([
      {
        numeroItem: 5,
        descricao: 'Item B',
        valorTotal: 100,
        cnpj: '1',
        cnpjFormatado: '1',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'Org 1',
        linkPregaoPncp: ''
      },
      {
        numeroItem: 2,
        descricao: 'Item A',
        valorTotal: 800,
        cnpj: '2',
        cnpjFormatado: '2',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'Org 2',
        linkPregaoPncp: ''
      }
    ]);

    // Ordenar por valorTotal ascendente
    page.ordenacaoColuna.set('valorTotal');
    page.ordenacaoAsc.set(true);
    let ordenados = page.itensFiltrados();
    expect(ordenados[0].numeroItem).toBe(5); // 100 < 800

    // Ordenar descendente
    page.ordenacaoAsc.set(false);
    ordenados = page.itensFiltrados();
    expect(ordenados[0].numeroItem).toBe(2); // 800 > 100
  });

  it('deve ordenar alfabeticamente pela descricao do item crescente e decrescente', () => {
    page.todosItensEncontrados.set([
      {
        numeroItem: 1,
        descricao: 'Zíper para pastas',
        cnpj: '1',
        cnpjFormatado: '1',
        ano: 2026,
        seqCompra: '1',
        nomeOrgao: 'Org 1',
        linkPregaoPncp: ''
      },
      {
        numeroItem: 2,
        descricao: 'Armário de aço',
        cnpj: '2',
        cnpjFormatado: '2',
        ano: 2026,
        seqCompra: '2',
        nomeOrgao: 'Org 2',
        linkPregaoPncp: ''
      },
      {
        numeroItem: 3,
        descricao: 'Cadeira ergonômica',
        cnpj: '3',
        cnpjFormatado: '3',
        ano: 2026,
        seqCompra: '3',
        nomeOrgao: 'Org 3',
        linkPregaoPncp: ''
      }
    ]);

    // Ordenação A-Z (crescente)
    page.mudarOrdenacao('descricao');
    expect(page.ordenacaoColuna()).toBe('descricao');
    expect(page.ordenacaoAsc()).toBe(true);

    let ordenados = page.itensFiltrados();
    expect(ordenados[0].descricao).toBe('Armário de aço');
    expect(ordenados[1].descricao).toBe('Cadeira ergonômica');
    expect(ordenados[2].descricao).toBe('Zíper para pastas');

    // Clicar novamente inverte para Z-A (decrescente)
    page.mudarOrdenacao('descricao');
    expect(page.ordenacaoAsc()).toBe(false);

    ordenados = page.itensFiltrados();
    expect(ordenados[0].descricao).toBe('Zíper para pastas');
    expect(ordenados[1].descricao).toBe('Cadeira ergonômica');
    expect(ordenados[2].descricao).toBe('Armário de aço');
  });

  it('deve destacar termos no texto com segurança contra XSS', () => {
    const texto = 'Fornecimento de <img src=x onerror=alert(1)> cadeiras pretas';
    const termo = 'cadeiras';
    const resultado = page.destacarTermo(texto, termo);
    expect(resultado).not.toContain('<img');
    expect(resultado).toContain('&lt;img');
    expect(resultado).toContain('<strong class="font-bold text-neutral-900 dark:text-neutral-100">cadeiras</strong>');
  });
});
