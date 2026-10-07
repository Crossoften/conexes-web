// src/app/features/auth/forgot-password/forgot-password.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ForgotPasswordService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/no-auth`;

  /** Dispara o e-mail com o código de 4 dígitos (validade de 4 horas). */
  requestCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot`, { email });
  }

  /** Redefine a senha usando o código recebido. */
  reset(code: string, password: string, confirmPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/reset`, { code, password, confirmPassword });
  }
}
