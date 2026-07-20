// src/app/app.config.ts
import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { appRoutes } from './app.routes';
import { AuthService }        from './core/auth/auth.service';
import { authInterceptor }    from './core/http/auth.interceptor';
import { errorInterceptor }   from './core/http/error.interceptor';
import { loadingInterceptor } from './core/http/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withViewTransitions(),
      withHashLocation(),
    ),
    provideHttpClient(
      withInterceptors([
        authInterceptor,    // 1º — injeta o Bearer token
        errorInterceptor,   // 2º — trata 401/403 globalmente
        loadingInterceptor, // 3º — controla o estado de loading global
      ])
    ),
    provideAnimationsAsync(),
    {
      // Recarrega /my-self no bootstrap para sessões abertas obterem purchaseRoles.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (auth: AuthService) => () => auth.refreshProfile(),
      deps: [AuthService],
    },
  ],
};
