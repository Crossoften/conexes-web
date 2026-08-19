import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Registra os dados do locale pt-BR (usado explicitamente por pipes number/date
// nas telas de integração). Não altera o LOCALE_ID global do app.
registerLocaleData(localePt, 'pt-BR');

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
