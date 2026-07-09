// src/app/shared/utils/format.ts
//
// Helpers de normalização de valores mascarados antes de enviar à API.
// A API espera dígitos crus para CNPJ/CPF/CEP/telefone.

/** Remove tudo que não for dígito. `null`/`undefined` → string vazia. */
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Formata um número como moeda BRL. `null`/`undefined` → travessão. */
export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
