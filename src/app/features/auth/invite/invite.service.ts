// src/app/features/auth/invite/invite.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InvitePreview {
  name:      string;
  surname?:  string;
  email:     string;
  jobTitle?: string;
  area?:     string;
  phone?:    string;
  document?: string;
}

export interface AcceptInvitePayload {
  token:           string;
  password:        string;
  confirmPassword: string;
  surname?:        string;
  phone?:          string;
  document?:       string;
  jobTitle?:       string;
  area?:           string;
}

@Injectable({ providedIn: 'root' })
export class InviteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/no-auth/invite`;

  /** Valida o token do link e devolve o que o gerencial já preencheu. */
  find(token: string): Observable<InvitePreview> {
    return this.http.get<InvitePreview>(this.base, { params: { token } });
  }

  /** Conclui o cadastro: define a senha e ativa a conta. */
  accept(payload: AcceptInvitePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/accept`, payload);
  }
}
