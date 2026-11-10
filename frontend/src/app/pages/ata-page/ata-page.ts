import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PncpService } from '../../services/pncp.service';
import { StatusAnaliseService } from '../../services/status-analise.service';
import { AtaVinculada, PregaoAgrupado, DetalheCompraPncp, ArquivoPublicacaoPncp } from '../../models/pncp.models';

@Component({
  selector: 'app-ata-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ata-page.html',
  styleUrl: './ata-page.css'
})
export class AtaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private pncpService = inject(PncpService);
  statusAnaliseService = inject(StatusAnaliseService);

  cnpj = signal<string>('');
  ano = signal<string>('');
  seqCompra = signal<string>('');
  seqAta = signal<string>('');

  carregando = signal<boolean>(true);
  feedbackCopiado = signal<string | null>(null);

  ata = signal<AtaVinculada | null>(null);
  pregao = signal<PregaoAgrupado | null>(null);
  detalheCompra = signal<DetalheCompraPncp | null>(null);

  // Arquivos e documentos oficiais da Ata (PDFs assinados)
  arquivosAta = signal<ArquivoPublicacaoPncp[]>([]);
  carregandoArquivos = signal<boolean>(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const cnpj = params.get('cnpj') || '';
      const ano = params.get('ano') || '';
      const seqCompra = params.get('seqCompra') || '';
      const seqAta = params.get('seqAta') || '';

      this.cnpj.set(cnpj);
      this.ano.set(ano);
      this.seqCompra.set(seqCompra);
      this.seqAta.set(seqAta);

      this.carregarDadosAta(cnpj, ano, seqCompra, seqAta);
    });
  }

  carregarDadosAta(cnpj: string, ano: string, seqCompra: string, seqAta: string) {
    this.carregando.set(true);

    // 1. Tenta recuperar do cache local
    const { pregao, ata } = this.pncpService.obterAtaCache(cnpj, ano, seqCompra, seqAta);
    if (pregao) this.pregao.set(pregao);
    if (ata) this.ata.set(ata);

    // 2. Se a ata não veio completa do cache, busca no endpoint da Ata no PNCP
    if (!this.ata()) {
      const chavePregao = `${cnpj}_${ano}_${seqCompra}`;
      const urlAtaWeb = `https://pncp.gov.br/app/atas/${cnpj}/${ano}/${seqCompra}/${seqAta}`;
      this.ata.set({
        id: `${chavePregao}_${seqAta}`,
        titulo: `Ata de Registro de Preços nº ${seqAta}/${ano}`,
        numeroAta: seqAta,
        ano: Number(ano),
        seqAta: seqAta,
        urlAtaPncp: urlAtaWeb,
        objeto: 'Dados da Ata consultados diretamente no PNCP.',
        isVigente: true,
        statusVigencia: 'desconhecido',
        permiteAdesao: true
      });

      this.pncpService.consultarAtaIndividual(cnpj, ano, seqCompra, seqAta).subscribe(ataRemota => {
        if (ataRemota) {
          this.ata.set(ataRemota);
        }
      });
    }

    // 3. Busca dados do edital pai na API
    this.pncpService.consultarDetalhesCompra(cnpj, ano, seqCompra).subscribe({
      next: (detalhe) => {
        this.detalheCompra.set(detalhe);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
      }
    });

    // 4. Carrega os arquivos/PDFs oficiais da Ata no PNCP
    this.carregandoArquivos.set(true);
    this.pncpService.consultarArquivosAta(cnpj, ano, seqCompra, seqAta).subscribe({
      next: (arquivos) => {
        this.arquivosAta.set(arquivos);
        this.carregandoArquivos.set(false);
      },
      error: () => {
        this.carregandoArquivos.set(false);
      }
    });
  }

  copiarTexto(texto: string, label: string) {
    navigator.clipboard.writeText(texto).then(() => {
      this.feedbackCopiado.set(`${label} copiado!`);
      setTimeout(() => this.feedbackCopiado.set(null), 2500);
    });
  }

  formatarCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}
