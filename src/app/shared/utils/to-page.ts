// src/app/shared/utils/to-page.ts
//
// Normalizador de envelopes de listagem. O backend responde de formas diferentes
// por módulo — { data, count, pages } (compras, admins), { data, total } ou array
// puro. Este utilitário converte qualquer um deles para o Page<T> canônico do app.

import { Page } from '../models/list-page.model';

/** Envelope de listagem aceito da API. */
export interface RawListEnvelope<T> {
  data?:  T[];
  total?: number;
  count?: number;
  pages?: number;
}

/** Normaliza qualquer um dos formatos de listagem para `{ data, total }`. */
export function toPage<T>(res: RawListEnvelope<T> | T[]): Page<T> {
  if (Array.isArray(res)) return { data: res, total: res.length };
  const data = res.data ?? [];
  return { data, total: res.total ?? res.count ?? data.length };
}
