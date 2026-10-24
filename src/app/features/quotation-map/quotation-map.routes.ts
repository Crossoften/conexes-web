import { Routes } from '@angular/router';
import { QuotationMapPage } from './quotation-map.page';

export const quotationMapRoutes: Routes = [
  // COMP-21: o mapa deixa de ser um modulo que se abre do zero e passa a ser
  // aberto a partir da Etapa 4, com a requisicao já escolhida. A rota sem id
  // continua existindo para não quebrar link antigo nem o acesso direto.
  { path: ':requestId', component: QuotationMapPage },
  { path: '', component: QuotationMapPage },
];
