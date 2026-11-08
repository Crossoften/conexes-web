// src/environments/environment.prod.ts — build de PRODUÇÃO (card #720)
// `npm run build:prod` → publicado pelo devops em https://conexao3setor.com.br/
// Fala SOMENTE com a API de produção (a mesma que o painel de produção publicado usa).
export const environment = {
  production: true,
  name: 'production' as 'local' | 'homolog' | 'production',
  apiUrl: 'https://conexao3setor.com.br:3000',
  // hosts onde este build se recusa a abrir (main.ts): o servidor de homologação
  forbiddenHosts: ['homolog.crosoften.com'],
};
