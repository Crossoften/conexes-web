// src/environments/environment.ts — desenvolvimento local (ng serve)
export const environment = {
  production: false,
  name: 'local' as 'local' | 'homolog' | 'production',
  apiUrl: 'http://localhost:3010',
  forbiddenHosts: [] as string[],
};
