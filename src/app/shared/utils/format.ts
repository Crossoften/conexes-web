// src/app/shared/utils/format.ts
//
// Helpers de normalização de valores mascarados antes de enviar à API.
// A API espera dígitos crus para CNPJ/CPF/CEP/telefone.

/** Remove tudo que não for dígito. `null`/`undefined` → string vazia. */
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}
