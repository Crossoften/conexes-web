// src/environments/environment.homolog.ts — build de HOMOLOGAÇÃO (card #720)
// `npm run build:homolog` → publicado em https://homolog.crosoften.com/conex3s/
// Fala SOMENTE com a API de homologação.
export const environment = {
  production: true,
  name: 'homolog' as 'local' | 'homolog' | 'production',
  apiUrl: 'https://homolog.crosoften.com:8047',
  // hosts onde este build se recusa a abrir (main.ts): o domínio de produção
  forbiddenHosts: ['conexao3setor.com.br', 'www.conexao3setor.com.br'],
};
