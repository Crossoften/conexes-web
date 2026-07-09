// src/app/shared/services/upload.service.ts
//
// Upload de arquivo único (multipart) → { fileUrl, fileKey }.
// Reutilizável por órgãos (logo), planos e parcerias (anexos).

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadedFile {
  fileUrl: string;
  fileKey: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);

  uploadOneFile(file: File): Observable<UploadedFile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadedFile>(`${environment.apiUrl}/v1/upload/one-file`, form);
  }
}
