import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService (Controle de Modo Escuro/Claro)', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    service = new ThemeService();
  });

  it('deve alternar o tema e aplicar classe dark na tag html', () => {
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    service.toggleTheme();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('consulta_contratacoes_theme_v1')).toBe('dark');

    service.toggleTheme();
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('consulta_contratacoes_theme_v1')).toBe('light');
  });

  it('deve inicializar com o tema salvo no localStorage', () => {
    localStorage.setItem('consulta_contratacoes_theme_v1', 'dark');
    const novoService = new ThemeService();
    expect(novoService.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
