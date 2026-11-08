import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Registra os dados do locale pt-BR (usado explicitamente por pipes number/date
// nas telas de integração). Não altera o LOCALE_ID global do app.
registerLocaleData(localePt, 'pt-BR');

// Card #720: homologação nunca fala com produção. Um build aberto no servidor do outro
// ambiente (painel de produção publicado em homolog, ou o contrário) não sobe: mostra o
// motivo em vez de fazer login contra a API errada.
const host = location.hostname.toLowerCase();
if (environment.forbiddenHosts.includes(host)) {
  document.body.innerHTML =
    `<div style="font-family:sans-serif;max-width:560px;margin:15vh auto;padding:24px;border:1px solid #f0c36d;border-radius:12px;background:#fffbea">` +
    `<h2 style="margin-top:0">Build de ${environment.name} publicado no lugar errado</h2>` +
    `<p>Este pacote do painel fala com <b>${environment.apiUrl}</b> e não pode abrir em <b>${host}</b>.</p>` +
    `<p>Gere o pacote do ambiente certo: <code>npm run build:homolog</code> ou <code>npm run build:prod</code>.</p></div>`;
} else {
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error(err));
}
