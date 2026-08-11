// src/app/features/profile/profile.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MyProfile {
  id:       number;
  name:     string;
  email:    string;
  phone?:   string;
  role?:    string;
  status?:  string;
  jobTitle?: string;
  area?:    string;
  document?: string;
}

export interface UpdateProfilePayload {
  name?:     string;
  phone?:    string;
  jobTitle?: string;
  area?:     string;
  document?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/v1`;

  getMe(): Observable<MyProfile> {
    return this.http.get<MyProfile>(`${this.api}/my-self`);
  }

  update(id: number, payload: UpdateProfilePayload): Observable<unknown> {
    return this.http.patch(`${this.api}/users/${id}`, payload);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.patch(`${this.api}/my-self/change-password`, { currentPassword, newPassword });
  }
}
