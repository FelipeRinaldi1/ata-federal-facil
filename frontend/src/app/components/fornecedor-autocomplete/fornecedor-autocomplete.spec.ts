import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { FornecedorAutocompleteComponent } from './fornecedor-autocomplete';

describe('FornecedorAutocompleteComponent (Autocomplete PNCP)', () => {
  let fakeService: any;
  let component: FornecedorAutocompleteComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeService = {
      sugerirFornecedores: vi.fn().mockReturnValue(
        of([
          { id: '183071', ni: '11.666.105/0003-62', nome: 'DELLAMED S.A.', total: 198 },
          { id: '2608', ni: '72.381.189/0001-10', nome: 'DELL COMPUTADORES DO BRASIL LTDA', total: 130 }
        ])
      )
    };
    component = new FornecedorAutocompleteComponent(fakeService);
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('não deve consultar API com menos de 3 caracteres', () => {
    component.onInput('de');
    vi.advanceTimersByTime(350);

    expect(fakeService.sugerirFornecedores).not.toHaveBeenCalled();
    expect(component.termoAbaixoDoMinimo()).toBe(true);
    expect(component.sugestoes().length).toBe(0);
  });

  it('deve consultar sugestões no PNCP após debounce com 3 ou mais caracteres', () => {
    component.onInput('dell');
    vi.advanceTimersByTime(350);

    expect(fakeService.sugerirFornecedores).toHaveBeenCalledWith('dell', 20);
    expect(component.sugestoes().length).toBe(2);
    expect(component.sugestoes()[0].nome).toBe('DELLAMED S.A.');
    expect(component.indiceAtivo()).toBe(0);
  });

  it('deve emitir fornecedor selecionado ao escolher opção e limpar corretamente', () => {
    const emitidos: any[] = [];
    component.fornecedorChange.subscribe(v => emitidos.push(v));

    component.onInput('dell');
    vi.advanceTimersByTime(350);

    component.selecionar(component.sugestoes()[1]);
    expect(component.fornecedorSelecionado?.id).toBe('2608');
    expect(component.aberto()).toBe(false);
    expect(emitidos[emitidos.length - 1]).toEqual(
      expect.objectContaining({ id: '2608', nome: 'DELL COMPUTADORES DO BRASIL LTDA' })
    );

    component.limpar();
    expect(component.fornecedorSelecionado).toBeNull();
    expect(component.textoDigitado()).toBe('');
    expect(emitidos[emitidos.length - 1]).toBeNull();
  });

  it('deve permitir navegação por teclado (ArrowDown, ArrowUp, Enter e Escape)', () => {
    const emitidos: any[] = [];
    component.fornecedorChange.subscribe(v => emitidos.push(v));

    component.onInput('dell');
    vi.advanceTimersByTime(350);

    // Começa no índice 0; ArrowDown vai para 1
    component.onKeydown({ key: 'ArrowDown', preventDefault: vi.fn() } as any);
    expect(component.indiceAtivo()).toBe(1);

    // Enter seleciona o item ativo (índice 1)
    component.onKeydown({ key: 'Enter', preventDefault: vi.fn() } as any);
    expect(emitidos[0]?.id).toBe('2608');
  });
});
