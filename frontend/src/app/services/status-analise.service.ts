import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StatusAnaliseService {
  private readonly STORAGE_KEY = 'consulta_contratacoes_analisadas_v1';

  // Armazena conjunto de IDs de atas checadas/analisadas
  atasAnalisadas = signal<Set<string>>(new Set());

  constructor() {
    this.carregarDoStorage();
  }

  isAtaAnalisada(ataId: string): boolean {
    return this.atasAnalisadas().has(ataId);
  }

  toggleAta(ataId: string, chavePregao?: string): void {
    const set = new Set(this.atasAnalisadas());
    if (set.has(ataId)) {
      set.delete(ataId);
    } else {
      set.add(ataId);
    }
    this.atasAnalisadas.set(set);
    this.salvarNoStorage();
  }

  /**
   * Alterna estado do pregão:
   * - Se está completo ou parcial -> desmarca todas as atas
   * - Se está não analisado -> marca todas as atas do pregão
   */
  togglePregao(atasIds: string[]): void {
    if (!atasIds.length) return;

    const set = new Set(this.atasAnalisadas());
    const todasMarcadas = atasIds.every(id => set.has(id));

    if (todasMarcadas) {
      // Desmarca todas deste pregão
      atasIds.forEach(id => set.delete(id));
    } else {
      // Marca todas deste pregão
      atasIds.forEach(id => set.add(id));
    }

    this.atasAnalisadas.set(set);
    this.salvarNoStorage();
  }

  getPregaoStatus(atasIds: string[]): 'pendente' | 'em-analise' | 'analisado' {
    if (!atasIds.length) return 'pendente';

    const marcadas = atasIds.filter(id => this.atasAnalisadas().has(id)).length;
    if (marcadas === 0) return 'pendente';
    if (marcadas === atasIds.length) return 'analisado';
    return 'em-analise';
  }

  private salvarNoStorage(): void {
    try {
      const array = Array.from(this.atasAnalisadas());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(array));
    } catch (e) {
      console.warn('Não foi possível salvar no localStorage:', e);
    }
  }

  private carregarDoStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.atasAnalisadas.set(new Set(parsed));
        }
      }
    } catch (e) {
      console.warn('Não foi possível carregar do localStorage:', e);
    }
  }
}
