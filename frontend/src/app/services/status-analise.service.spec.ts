import { describe, it, expect, beforeEach } from 'vitest';
import { StatusAnaliseService } from './status-analise.service';

describe('StatusAnaliseService (Persistência e Estados de Checkmark)', () => {
  let service: StatusAnaliseService;

  beforeEach(() => {
    localStorage.clear();
    service = new StatusAnaliseService();
  });

  it('deve alternar status de uma ata individual e persistir no localStorage', () => {
    expect(service.isAtaAnalisada('ata-1')).toBe(false);

    service.toggleAta('ata-1');
    expect(service.isAtaAnalisada('ata-1')).toBe(true);

    // Valida persistência criando uma nova instância do serviço
    const novoService = new StatusAnaliseService();
    expect(novoService.isAtaAnalisada('ata-1')).toBe(true);

    service.toggleAta('ata-1');
    expect(service.isAtaAnalisada('ata-1')).toBe(false);
  });

  it('deve calcular corretamente os 3 estados do Pregão (pendente, em-analise, analisado)', () => {
    const atasDoPregao = ['a1', 'a2', 'a3'];

    // Estado 1: Vazio / Pendente (nenhuma ata checada)
    expect(service.getPregaoStatus(atasDoPregao)).toBe('pendente');

    // Estado 2: Incompleto / Em Análise (1 ou 2 de 3 checadas)
    service.toggleAta('a1');
    expect(service.getPregaoStatus(atasDoPregao)).toBe('em-analise');

    // Estado 3: Completo / Analisado (todas checadas)
    service.toggleAta('a2');
    service.toggleAta('a3');
    expect(service.getPregaoStatus(atasDoPregao)).toBe('analisado');
  });

  it('deve marcar todas as atas ao alternar um pregão pendente e desmarcar todas ao alternar um pregão completo', () => {
    const atas = ['x1', 'x2'];

    // De pendente para completo
    service.togglePregao(atas);
    expect(service.isAtaAnalisada('x1')).toBe(true);
    expect(service.isAtaAnalisada('x2')).toBe(true);
    expect(service.getPregaoStatus(atas)).toBe('analisado');

    // De completo para pendente
    service.togglePregao(atas);
    expect(service.isAtaAnalisada('x1')).toBe(false);
    expect(service.isAtaAnalisada('x2')).toBe(false);
    expect(service.getPregaoStatus(atas)).toBe('pendente');
  });
});
