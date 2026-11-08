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

/**
 * Card #720 (CP-01/PC-01): data vinda da API → `dd/mm/aaaa`.
 * Data civil (requisição, entrega, período) é gravada à meia-noite UTC; formatada no fuso
 * do navegador (UTC−3) virava o dia anterior (07/11 → 06/11). Meia-noite UTC é lida como o
 * dia civil; qualquer outro instante (createdAt etc.) segue no fuso de quem usa.
 */
export function formatCivilDateBR(value: string | null | undefined, empty = '—'): string {
  if (!value) return empty;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.0+)?Z)?$/.test(s)) return formatDateBR(s);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
}

/**
 * Card #720 (FN-05): `dd/mm/aaaa` → ISO (meia-noite UTC), ou `undefined` se a data não existe.
 * `Date.UTC` "rola" dia/mês fora da faixa (20/26/1105 virava 1107); aqui a data precisa voltar
 * igual ao que foi digitado e o ano ficar entre 1900 e 2100.
 */
export function parseDateBR(value: string | null | undefined): string | undefined {
  const br = (value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!br) return undefined;
  const [dia, mes, ano] = [+br[1], +br[2], +br[3]];
  if (ano < 1900 || ano > 2100) return undefined;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return undefined;
  return d.toISOString();
}

/** Validator de formulário para `parseDateBR` (vazio fica com o `required`). */
export function dateBRValidator(control: { value: unknown }): { dateBR: true } | null {
  const v = String(control.value ?? '').trim();
  return !v || parseDateBR(v) ? null : { dateBR: true };
}

// ── Máscaras de input (aplicar no (input); a API recebe os dígitos crus) ───────

/** Máscara de CNPJ a partir dos dígitos: `00.000.000/0000-00`. */
export function maskCnpj(value: string | null | undefined): string {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Máscara de CPF: `000.000.000-00`. */
export function maskCpf(value: string | null | undefined): string {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Máscara de CEP: `00000-000`. */
export function maskCep(value: string | null | undefined): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/** Máscara de telefone BR: `(00) 0000-0000` (fixo) ou `(00) 00000-0000` (celular). */
export function maskPhone(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Máscara de moeda BR a partir de dígitos (centavos): `"123456"` → `"1.234,56"` (sem símbolo). */
export function maskMoney(value: string | null | undefined): string {
  const d = onlyDigits(value);
  if (!d) return '';
  return (Number(d) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Número → `"1.234,56"` (sem símbolo). Para preencher o input ao editar. */
export function formatDecimalBR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** `"1.234,56"` / `"1,5"` / `"1.5"` → número. Vazio/ inválido → 0.
 *  Regra: se tiver vírgula, ela é o decimal (e o ponto é milhar); senão, o ponto é o decimal. */
export function parseDecimalBR(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const s = (value ?? '').toString().trim();
  if (!s) return 0;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
