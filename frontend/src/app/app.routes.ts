import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';
import { EditalPage } from './pages/edital-page/edital-page';
import { AtaPage } from './pages/ata-page/ata-page';
import { BuscaProfundaPage } from './pages/busca-profunda-page/busca-profunda-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'busca-profunda', component: BuscaProfundaPage },
  { path: 'edital/:cnpj/:ano/:seqCompra', component: EditalPage },
  { path: 'ata/:cnpj/:ano/:seqCompra/:seqAta', component: AtaPage },
  { path: '**', redirectTo: '' }
];
