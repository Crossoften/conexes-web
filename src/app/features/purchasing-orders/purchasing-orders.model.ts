// src/app/features/purchasing-orders/purchasing-orders.model.ts
//
// View model da lista de Pedidos de Compra (FE-9), derivado de PurchaseOrder.

/** Rótulos/variação de badge por status de pedido (fallback prettifica valores desconhecidos). */
export const ORDER_STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  Pending:   { label: 'Pendente',  variant: 'warning' },
  Open:      { label: 'Aberto',    variant: 'neutral' },
  Sent:      { label: 'Enviado',   variant: 'neutral' },
  Completed: { label: 'Concluído', variant: 'success' },
  Received:  { label: 'Recebido',  variant: 'success' },
  Cancelled: { label: 'Cancelado', variant: 'danger'  },
};

export interface OrderRow {
  id:         string;  // String(apiId) — chave de trilha
  apiId:      number;
  number:     string;  // nº do pedido (ou #id)
  requestRef: string;  // requisição de origem
  supplier:   string;
  totalValue: string;  // formatado
  status:     string;  // valor cru (para o badge)
  createdAt:  string;  // formatado
}
