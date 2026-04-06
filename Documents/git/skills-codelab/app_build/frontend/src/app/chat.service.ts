import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatRequest {
  query: string;
  session_id?: string; // Opcional: undefined en la primera interacción
}

export interface ChatResponse {
  session_id: string; // Backend siempre devuelve el ID de sesión activa
  respuesta: string;
  fuentes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  // URI estricta del MVP Local Backend
  private API_URL = 'http://localhost:3000/chatbot/query';

  enviarBurbuja(pregunta: string, apiKey: string, sessionId?: string): Observable<ChatResponse> {
    const cabeceras = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-api-key': apiKey
    });

    const body: ChatRequest = {
      query: pregunta,
      ...(sessionId ? { session_id: sessionId } : {}), // Solo incluir si existe
    };

    return this.http.post<ChatResponse>(this.API_URL, body, { headers: cabeceras });
  }
}
