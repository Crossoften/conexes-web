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

/** Data ISO (yyyy-mm-dd…) → `dd/mm/aaaa`. Vazio/ inválido → travessão. */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  const m = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}
