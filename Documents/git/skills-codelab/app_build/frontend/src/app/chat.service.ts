import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  respuesta: string;
  tiempo_ms: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  // URI estricta del MVP Local Backend
  private API_URL = 'http://localhost:3000/chatbot/query';

  enviarBurbuja(pregunta: string, apiKey: string): Observable<ChatResponse> {
    const cabeceras = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}` // Pasaportes de Seguridad Multi-Tenant
    });

    return this.http.post<ChatResponse>(this.API_URL, { query: pregunta }, { headers: cabeceras });
  }
}
