import 'zone.js';
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './app';
import { ThemeService } from './services/theme.service';

describe('App Component (Shell e Cabeçalho)', () => {
  let themeService: ThemeService;
  let app: App;

  beforeEach(() => {
    themeService = new ThemeService();
    app = new App(themeService);
  });

  it('deve instanciar o app com o ThemeService', () => {
    expect(app.themeService).toBeDefined();
    expect(typeof app.themeService.isDarkMode()).toBe('boolean');
  });
});
