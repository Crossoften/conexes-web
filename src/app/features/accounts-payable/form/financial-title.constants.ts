// src/app/features/accounts-payable/form/financial-title.constants.ts
/**
 * Card #768 (itens 47, 50 e 58): listas do formulário de contas a pagar e a
 * receber, com os valores do PDF de reteste de 05/11.
 */

/** Tipo de lançamento (obrigatório). */
export const TIPOS_LANCAMENTO = ['Real', 'Projetado'];

/**
 * Tipo de documento (obrigatório). O valor gravado é a sigla — é o que a coluna
 * "Tipo" da lista já mostra (a importação de XML grava "NF").
 */
export const TIPOS_DOCUMENTO = [
  { valor: 'NF', rotulo: 'Nota fiscal' },
  { valor: 'NFS', rotulo: 'Nota de serviço' },
  { valor: 'Recibo', rotulo: 'Recibo' },
  { valor: 'Fatura', rotulo: 'Fatura' },
  { valor: 'Boleto', rotulo: 'Boleto' },
  { valor: 'DARF', rotulo: 'DARF' },
  { valor: 'GPS', rotulo: 'GPS (Guia da Previdência Social)' },
  { valor: 'FGTS', rotulo: 'FGTS' },
  { valor: 'Outros', rotulo: 'Outros' },
];

/** Meio de pagamento (obrigatório em pagar; meio de recebimento em receber). */
export const MEIOS_PAGAMENTO = ['Internet banking', 'Cartão de crédito', 'Débito automático', 'Dinheiro', 'Cheque', 'Outros'];

/** Tipo de pagamento (meio internet) — valores do enum PaymentMethod do servidor. */
export const TIPOS_PAGAMENTO = [
  { valor: 'EletronicTransferOtherOwner', rotulo: 'Transferência Eletrônica (Outra Titularidade)' },
  { valor: 'TEDOtherOwner', rotulo: 'TED (Outra Titularidade)' },
  { valor: 'DOCOtherOwner', rotulo: 'DOC (Outra Titularidade)' },
  { valor: 'BoletoSameBank', rotulo: 'Boleto Simples (Mesmo banco do pagamento)' },
  { valor: 'BoletoOtherBank', rotulo: 'Boleto Simples (Outros Bancos)' },
  { valor: 'UtilityBill', rotulo: 'Contas de Concessionárias' },
  { valor: 'DARFWithBarcode', rotulo: 'DARF com Código de Barras' },
  { valor: 'GARE', rotulo: 'GARE - SP ICMS' },
  { valor: 'GNRE_StateTaxes', rotulo: 'GNRE e Tributos Estaduais' },
  { valor: 'GPS', rotulo: 'GPS (Guia da Previdência Social)' },
  { valor: 'FGTS', rotulo: 'FGTS' },
  { valor: 'IPVA', rotulo: 'IPVA' },
  { valor: 'DPVAT', rotulo: 'DPVAT' },
  { valor: 'DARFWithoutBarcode', rotulo: 'DARF sem Código de Barras' },
  { valor: 'IPTU', rotulo: 'IPTU/ISS/OUTROS TRIBUTOS MUNICIPAIS' },
  { valor: 'PIX', rotulo: 'PIX' },
];

/** Rótulo de qualquer valor do enum (inclui os antigos, para a visualização). */
export const ROTULO_TIPO_PAGAMENTO: Record<string, string> = {
  ...Object.fromEntries(TIPOS_PAGAMENTO.map(t => [t.valor, t.rotulo])),
  EletronicTransferSameOwner: 'Transferência Eletrônica (Mesma Titularidade)',
  TEDSameOwner: 'TED (Mesma Titularidade)',
  DOCSameOwner: 'DOC (Mesma Titularidade)',
  SP_ICMS: 'GARE - SP ICMS',
  INSS_MunicipalTaxes: 'Tributos municipais',
};

/**
 * Card #768 (item 50): códigos de recolhimento por imposto, conforme a listagem
 * repassada pelo cliente no plano de testes validado de 02/08/2026 (caso TX-2).
 * ISS tem código aberto (o usuário informa); IBS e CBS ainda não têm lista.
 */
export const CODIGOS_IMPOSTO: Record<string, string[] | 'livre'> = {
  IRRF: ['1708', '3280', '8045'],
  PIS: ['5979'],
  PCC: ['5952', '8863'],
  COFINS: ['5960'],
  INSS: ['2631'],
  CSLL: ['5987'],
  ISS: 'livre',
  IBS: [],
  CBS: [],
};

/** Os nove impostos retidos, na ordem do formulário. */
export const IMPOSTOS = ['IRRF', 'PIS', 'PCC', 'COFINS', 'INSS', 'CSLL', 'ISS', 'IBS', 'CBS'];
