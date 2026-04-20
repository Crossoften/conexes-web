// src/app/core/http/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

// Serviço simples para controle de loading global
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  readonly loading = signal(false);

  start() { this.count++; this.loading.set(true); }
  stop()  { this.count = Math.max(0, this.count - 1); if (this.count === 0) this.loading.set(false); }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoadingService);
  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};
