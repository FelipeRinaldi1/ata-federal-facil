import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { PncpService } from '../../services/pncp.service';
import { FornecedorSugestao } from '../../models/pncp.models';

@Component({
  selector: 'app-fornecedor-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fornecedor-autocomplete.html',
  styleUrl: './fornecedor-autocomplete.css'
})
export class FornecedorAutocompleteComponent implements OnDestroy {
  private pncpService: PncpService;
  private busca$ = new Subject<string>();
  private sub: Subscription;

  fornecedorSelecionadoSignal = signal<FornecedorSugestao | null>(null);

  @Input()
  set fornecedorSelecionado(valor: FornecedorSugestao | null) {
    this.fornecedorSelecionadoSignal.set(valor);
    if (!valor) {
      if (!this.aberto()) {
        this.textoDigitado.set('');
        this.sugestoes.set([]);
        this.jaPesquisou.set(false);
      }
    } else {
      this.textoDigitado.set(valor.nome);
    }
  }
  get fornecedorSelecionado(): FornecedorSugestao | null {
    return this.fornecedorSelecionadoSignal();
  }

  @Input() inputId: string = 'campo-fornecedor';
  @Input() placeholder: string = 'Nome ou CNPJ do fornecedor...';

  @Output() fornecedorChange = new EventEmitter<FornecedorSugestao | null>();
  @Output() buscarEnter = new EventEmitter<void>();

  textoDigitado = signal<string>('');
  sugestoes = signal<FornecedorSugestao[]>([]);
  carregando = signal<boolean>(false);
  aberto = signal<boolean>(false);
  jaPesquisou = signal<boolean>(false);
  indiceAtivo = signal<number>(-1);

  constructor(pncpService?: PncpService) {
    this.pncpService = pncpService ?? inject(PncpService);

    this.sub = this.busca$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(termo => {
          const limpo = termo.replace(/\./g, '').trim();
          if (limpo.length < 3) {
            this.carregando.set(false);
            this.jaPesquisou.set(false);
            return of([] as FornecedorSugestao[]);
          }
          this.carregando.set(true);
          return this.pncpService.sugerirFornecedores(limpo, 20);
        })
      )
      .subscribe(lista => {
        this.sugestoes.set(lista);
        this.carregando.set(false);
        this.indiceAtivo.set(lista.length > 0 ? 0 : -1);
        const limpo = this.textoDigitado().replace(/\./g, '').trim();
        this.jaPesquisou.set(limpo.length >= 3);
      });
  }

  onInput(valor: string) {
    this.textoDigitado.set(valor);
    this.aberto.set(true);
    this.indiceAtivo.set(-1);

    if (this.fornecedorSelecionadoSignal()) {
      this.fornecedorSelecionadoSignal.set(null);
      this.fornecedorChange.emit(null);
    }

    const limpo = (valor || '').replace(/\./g, '').trim();
    if (limpo.length < 3) {
      this.sugestoes.set([]);
      this.carregando.set(false);
      this.jaPesquisou.set(false);
    }

    this.busca$.next(valor || '');
  }

  onFocus() {
    if (!this.fornecedorSelecionadoSignal()) {
      this.aberto.set(true);
    }
  }

  onBlur() {
    this.aberto.set(false);
    this.indiceAtivo.set(-1);
  }

  onKeydown(event: KeyboardEvent) {
    const lista = this.sugestoes();

    if (event.key === 'ArrowDown') {
      if (!this.aberto()) {
        this.aberto.set(true);
      }
      if (lista.length > 0) {
        event.preventDefault();
        this.indiceAtivo.update(i => (i + 1) % lista.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      if (lista.length > 0) {
        event.preventDefault();
        this.indiceAtivo.update(i => (i <= 0 ? lista.length - 1 : i - 1));
      }
      return;
    }

    if (event.key === 'Enter') {
      const idx = this.indiceAtivo();
      if (this.aberto() && idx >= 0 && idx < lista.length) {
        event.preventDefault();
        this.selecionar(lista[idx]);
      } else {
        this.aberto.set(false);
        this.buscarEnter.emit();
      }
      return;
    }

    if (event.key === 'Escape') {
      this.aberto.set(false);
      this.indiceAtivo.set(-1);
    }
  }

  selecionar(fornecedor: FornecedorSugestao) {
    this.fornecedorSelecionadoSignal.set(fornecedor);
    this.textoDigitado.set(fornecedor.nome);
    this.aberto.set(false);
    this.sugestoes.set([]);
    this.jaPesquisou.set(false);
    this.indiceAtivo.set(-1);
    this.fornecedorChange.emit(fornecedor);
  }

  limpar() {
    this.fornecedorSelecionadoSignal.set(null);
    this.textoDigitado.set('');
    this.sugestoes.set([]);
    this.carregando.set(false);
    this.jaPesquisou.set(false);
    this.aberto.set(false);
    this.indiceAtivo.set(-1);
    this.busca$.next('');
    this.fornecedorChange.emit(null);
  }

  termoAbaixoDoMinimo(): boolean {
    const limpo = this.textoDigitado().replace(/\./g, '').trim();
    return limpo.length < 3;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.busca$.complete();
  }
}
