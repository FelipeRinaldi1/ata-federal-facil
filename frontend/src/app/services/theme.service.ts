import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'consulta_contratacoes_theme_v1';
  
  // Sinal reativo que indica se o modo escuro está ativo
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.inicializarTema();
  }

  toggleTheme(): void {
    this.setDarkMode(!this.isDarkMode());
  }

  setDarkMode(escuro: boolean): void {
    this.isDarkMode.set(escuro);
    try {
      localStorage.setItem(this.STORAGE_KEY, escuro ? 'dark' : 'light');
    } catch (e) {
      console.warn('Erro ao salvar preferência de tema:', e);
    }
    this.aplicarClasseHtml(escuro);
  }

  private inicializarTema(): void {
    let prefereEscuro = false;
    try {
      const salvo = localStorage.getItem(this.STORAGE_KEY);
      if (salvo) {
        prefereEscuro = salvo === 'dark';
      } else if (typeof window !== 'undefined' && window.matchMedia) {
        prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      console.warn('Erro ao ler preferência de tema:', e);
    }

    this.isDarkMode.set(prefereEscuro);
    this.aplicarClasseHtml(prefereEscuro);
  }

  private aplicarClasseHtml(escuro: boolean): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (escuro) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }
}
