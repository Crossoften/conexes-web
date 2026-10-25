// src/app/features/purchases/components/purchase-quotation-map.modal.ts
//
// I023 — o Mapa de Cotação ABERTO DENTRO de Cotações (Etapa 4), como modal, sem
// trocar de tela. Reaproveita o componente QuotationMapPage em modo `embedded`.
// A rota /quotation-map/:requestId continua existindo para o link compartilhável.
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { QuotationMapPage } from '../../quotation-map/quotation-map.page';

@Component({
  selector: 'app-purchase-quotation-map-modal',
  standalone: true,
  imports: [QuotationMapPage],
  templateUrl: './purchase-quotation-map.modal.html',
  styleUrl: './purchase-quotation-map.modal.scss',
})
export class PurchaseQuotationMapModalComponent {
  @Input() requestId: number | null = null;
  @Input() requestCode = '';
  @Output() close = new EventEmitter<void>();

  onClose(): void { this.close.emit(); }
}
