import { Component, ChangeDetectionStrategy, signal, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';

interface UiMessage {
  text: string;
  sender: 'ai' | 'user';
}

@Component({
  selector: 'chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-sans text-wm-superblack">
      
      <!-- Panel Expansivo de Chat -->
      <div 
        class="w-[360px] max-h-[calc(100vh-120px)] sm:h-[550px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-wm-gray4 flex-col transition-all duration-300 transform origin-bottom-right"
        [ngClass]="isOpen() ? 'flex scale-100 opacity-100' : 'hidden scale-95 opacity-0'"
      >
          <!-- Chat Header Dinámico -->
          <div class="bg-wm-superblack text-white p-4 flex justify-between items-center shadow-md z-10">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-wm-orange flex items-center justify-center font-bold">WM</div>
              <div>
                <div class="font-bold text-lg tracking-wide leading-tight">{{ assistantName }}</div>
                <div class="text-wm-gray3 text-xs">Soporte Inteligente RM3</div>
              </div>
            </div>
            <button (click)="toggleChat()" class="text-wm-gray3 hover:text-white transition-colors cursor-pointer p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Historial de Conversación -->
          <div class="flex-1 bg-gray-50 p-4 shrink-0 overflow-y-auto flex flex-col gap-4">
             <!-- Mensaje de Bienvenida -->
             <div class="self-start max-w-[85%]">
                <div class="text-xs text-wm-gray2 mb-1 ml-1 font-medium">{{ assistantName }}</div>
                <div class="bg-white text-wm-gray1 text-sm p-3 rounded-2xl rounded-tl-sm shadow-sm border border-wm-gray4">
                  ¡Hola! Estoy listo para escanear tu base de conocimientos corporativa. ¿En qué te asesoro hoy?
                </div>
             </div>

             <!-- Array de Burbujas Dinámicas -->
             <ng-container *ngFor="let msg of messages()">
                <div [ngClass]="msg.sender === 'ai' ? 'self-start max-w-[85%]' : 'self-end max-w-[85%]'">
                  <!-- Nombre del Sender IA -->
                  <div *ngIf="msg.sender === 'ai'" class="text-xs text-wm-gray2 mb-1 ml-1 font-medium">{{ assistantName }}</div>
                  
                  <div [ngClass]="msg.sender === 'ai' 
                      ? 'bg-white text-wm-gray1 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-wm-gray4' 
                      : 'bg-wm-orange text-white p-3 rounded-2xl rounded-tr-sm shadow-md'">
                    {{ msg.text }}
                  </div>
                </div>
             </ng-container>

             <!-- Indicador de Cargando -->
             <div *ngIf="isLoading()" class="self-start max-w-[85%] mt-2">
                <div class="bg-wm-gray4 text-wm-gray1 text-sm p-3 rounded-2xl rounded-tl-sm animate-pulse flex gap-1 items-center">
                  <div class="w-2 h-2 bg-wm-gray2 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-wm-gray2 rounded-full animate-bounce delay-75"></div>
                  <div class="w-2 h-2 bg-wm-gray2 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>

          </div>

          <!-- Input Footer -->
          <div class="p-4 bg-white border-t border-wm-gray4">
            <div class="relative flex items-center">
              <input 
                type="text" 
                [(ngModel)]="currentPrompt"
                (keydown.enter)="sendQuery()"
                [disabled]="isLoading()"
                placeholder="Pregunta a tus documentos RAG..." 
                class="w-full bg-gray-100 border-none rounded-full py-3 pl-4 pr-12 text-sm text-wm-superblack focus:ring-2 focus:ring-wm-orange focus:outline-none transition-shadow disabled:opacity-50"
              >
              <button 
                (click)="sendQuery()"
                [disabled]="isLoading() || !currentPrompt.trim()"
                class="absolute right-1 w-10 h-10 bg-wm-orange disabled:bg-wm-gray3 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform -rotate-45 ml-1 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div class="text-center mt-2 text-[10px] text-wm-gray3">
              Protegido mediante API-KEY Local
            </div>
          </div>

      </div>

      <!-- Botón Flotante Invocador -->
      <button 
        (click)="toggleChat()"
        class="w-16 h-16 bg-wm-orange rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform duration-300 group cursor-pointer"
        [ngClass]="{'ring-4 ring-wm-orange/30': !isOpen()}"
      >
        <svg *ngIf="!isOpen()" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>

        <svg *ngIf="isOpen()" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

    </div>
  `
})
export class App {
  // Configuración Externa
  @Input('api-key') apiKey = 'test_key_rm3_2026'; // Forzado para compensar pérdida del Root Input
  @Input('assistant-name') assistantName = 'Asistente Digital';

  // Reactividad UI
  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<UiMessage[]>([]);
  currentPrompt = '';

  private chatSvc = inject(ChatService);

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  sendQuery() {
    if (!this.currentPrompt.trim()) return;

    // 1. Mostrar burbuja del usuario inmediatamente e indicar cargando
    const userText = this.currentPrompt.trim();
    this.messages.update(msgs => [...msgs, { text: userText, sender: 'user' }]);
    this.currentPrompt = '';
    this.isLoading.set(true);

    // 2. Disparar Petición por el Servicio HttpClient hacia el LLM remoto
    this.chatSvc.enviarBurbuja(userText, this.apiKey).subscribe({
      next: (response) => {
        // Respuesta del servidor RAG agregada al array
        this.messages.update(msgs => [...msgs, { text: response.respuesta, sender: 'ai' }]);
        this.isLoading.set(false);
      },
      error: (err) => {
        // Fallback gráfico de caída
        console.error("API Error", err);
        const errMsg = err.status === 401 
             ? 'Clave de seguridad Tenant_ID inválida o no provista en el widget.' 
             : 'Ocurrió un error conectando a las bases de conocimiento locales.';
        this.messages.update(msgs => [...msgs, { text: errMsg, sender: 'ai' }]);
        this.isLoading.set(false);
      }
    });
  }
}
