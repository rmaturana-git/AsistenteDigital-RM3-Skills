import { Component, ChangeDetectionStrategy, signal, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';

interface UiMessage {
  text: string;
  sender: 'ai' | 'user';
  sources?: string[]; // Fuentes documentales opcionales para mensajes del asistente
}

@Component({
  selector: 'chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      --rm3-orange: #F15A24;
      --rm3-orange-hover: #ff7e47;
      --glass-bg: rgba(255, 255, 255, 0.85);
      --ai-bubble: rgba(243, 244, 246, 0.9);
      --user-gradient: linear-gradient(135deg, #F15A24 0%, #ff8c42 100%);
      font-family: 'Inter', sans-serif;
    }

    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
      transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    }

    .chat-header {
      background: linear-gradient(90deg, #121212 0%, #2a2a2a 100%);
      border-bottom: 2px solid var(--rm3-orange);
    }

    .bubble-user {
      background: var(--user-gradient);
      box-shadow: 0 4px 15px rgba(241, 90, 36, 0.3);
      border-radius: 18px 18px 4px 18px;
    }

    .bubble-ai {
      background: var(--ai-bubble);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 18px 18px 18px 4px;
    }

    .animate-in {
      animation: springIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    @keyframes springIn {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .typing-dot {
      width: 6px; height: 6px; background: #999; border-radius: 50%;
      animation: typingJump 0.6s infinite alternate;
    }
    @keyframes typingJump { to { transform: translateY(-4px); opacity: 0.4; } }
    .delay-1 { animation-delay: 0.2s; }
    .delay-2 { animation-delay: 0.4s; }

    .source-tag {
      background: rgba(0,0,0,0.03);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 9px;
      color: #666;
      border: 1px solid rgba(0,0,0,0.05);
      margin-top: 2px;
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-action {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 6px;
      color: white;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-action:hover { background: rgba(255,255,255,0.25); border-color: white; }

    .btn-copy {
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .group:hover .btn-copy {
      opacity: 1;
    }
  `],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-5">
      
      <!-- Panel Expansivo de Chat -->
      <div 
        class="glass-panel rounded-[24px] overflow-hidden flex flex-col transform origin-bottom-right shadow-2xl max-h-[calc(100vh-100px)]"
        [ngClass]="[
           isOpen() ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none',
           isExpanded() ? 'w-[680px] h-[780px]' : 'w-[380px] h-[580px]'
        ]"
      >
          <!-- Chat Header Dinámico -->
          <div class="chat-header text-white p-5 flex justify-between items-center shadow-lg relative overflow-hidden">
            <!-- Brillo de fondo sutil -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-wm-orange opacity-10 blur-3xl rounded-full"></div>
            
            <div class="flex items-center gap-3.5 z-10">
              <div class="w-10 h-10 rounded-xl bg-wm-orange flex items-center justify-center shadow-inner overflow-hidden">
                <span class="text-white font-black text-xl tracking-tighter">RM3</span>
              </div>
              <div class="flex flex-col">
                <div class="font-bold text-base tracking-tight leading-none mb-1">{{ assistantName }}</div>
                <div class="text-[11px] text-gray-400 font-medium uppercase tracking-widest">{{ tenantName }}</div>
              </div>
            </div>

            <div class="flex items-center gap-2.5 z-10">
              <!-- Botón Expandir -->
              <button 
                (click)="toggleExpand($event)"
                class="btn-action"
                [attr.title]="isExpanded() ? 'Reducir tamaño' : 'Expandir vista'"
              >
                <svg *ngIf="!isExpanded()" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <svg *ngIf="isExpanded()" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12m-6 3l-3-3m0 0l3-3m-3 3h12M9 6l3 3m0 0l-3 3m3-3H3" />
                </svg>
              </button>

              <button 
                (click)="resetSession()"
                title="Nueva conversación"
                class="btn-action"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button (click)="toggleChat()" class="btn-action">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Historial de Conversación -->
          <div class="flex-1 p-5 overflow-y-auto flex flex-col gap-5 scroll-smooth custom-scrollbar">
             <!-- Mensaje de Bienvenida -->
             <div class="self-start max-w-[88%] animate-in">
                <div class="bubble-ai text-gray-800 text-sm p-4 shadow-sm leading-relaxed">
                  ¡Hola! Soy tu asistente inteligente de RM3. Estoy conectado a tu base de conocimientos corporativa para resolver tus dudas sobre acreditación.
                </div>
             </div>

             <!-- Array de Burbujas Dinámicas -->
             <ng-container *ngFor="let msg of messages()">
                <div [ngClass]="msg.sender === 'ai' ? 'self-start max-w-[92%] animate-in group' : 'self-end max-w-[88%] animate-in'">
                  <!-- Burbuja Principal -->
                  <div class="relative">
                    <div [ngClass]="msg.sender === 'ai' 
                        ? 'bubble-ai text-gray-800 p-4 shadow-sm leading-relaxed text-sm' 
                        : 'bubble-user text-white p-4 shadow-lg text-sm font-medium tracking-tight'">
                      {{ msg.text }}
                    </div>

                    <!-- Botón de Copia sutil (solo en IA) -->
                    <button 
                      *ngIf="msg.sender === 'ai'"
                      (click)="copyToClipboard(msg.text)"
                      class="btn-copy absolute -right-8 top-1 p-1.5 bg-white/60 hover:bg-white text-gray-400 hover:text-wm-orange rounded-md shadow-sm border border-black/5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>

                  <!-- Fuentes del mensaje IA -->
                  <div *ngIf="msg.sender === 'ai' && msg.sources && msg.sources.length > 0" class="mt-2 flex flex-wrap gap-1 slide-in opacity-80 hover:opacity-100 transition-opacity">
                    <div *ngFor="let src of msg.sources" class="source-tag">
                      {{ src }}
                    </div>
                  </div>
                </div>
             </ng-container>

             <!-- Indicador de Cargando -->
             <div *ngIf="isLoading()" class="self-start mt-2 ml-1">
                <div class="flex gap-1.5 p-3 rounded-full bg-gray-100/80 items-center px-4">
                  <div class="typing-dot"></div>
                  <div class="typing-dot delay-1"></div>
                  <div class="typing-dot delay-2"></div>
                </div>
             </div>
          </div>

          <!-- Input Footer -->
          <div class="p-5 bg-white/50 border-t border-gray-100 backdrop-blur-sm">
            <div class="relative flex items-center">
              <input 
                type="text" 
                [(ngModel)]="currentPrompt"
                (keydown.enter)="sendQuery()"
                [disabled]="isLoading()"
                placeholder="Escribe tu consulta aquí..." 
                class="w-full bg-gray-100/80 border-2 border-transparent rounded-[18px] py-3.5 pl-5 pr-14 text-sm text-gray-900 focus:bg-white focus:border-wm-orange/30 focus:shadow-lg focus:outline-none transition-all disabled:opacity-50 placeholder:text-gray-400 font-medium"
              >
              <button 
                (click)="sendQuery()"
                [disabled]="isLoading() || !currentPrompt.trim()"
                class="absolute right-1.5 w-11 h-11 bg-wm-orange shadow-[0_4px_12px_rgba(241,90,36,0.3)] disabled:bg-gray-300 disabled:shadow-none hover:bg-orange-600 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transform -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div class="text-center mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              RM3 RAG ENGINE • SECURITY READY
            </div>
          </div>

      </div>

      <!-- Botón Flotante Invocador -->
      <button 
        (click)="toggleChat()"
        class="w-20 h-20 bg-wm-orange rounded-[28px] shadow-2xl flex items-center justify-center text-white hover:scale-110 hover:-rotate-3 active:scale-95 transition-all duration-300 group cursor-pointer relative"
        [ngClass]="{'ring-8 ring-wm-orange/10': !isOpen()}"
      >
        <svg *ngIf="!isOpen()" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>

        <svg *ngIf="isOpen()" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        
        <!-- Badge de notificación sutil -->
        <div *ngIf="!isOpen()" class="absolute -top-1 -right-1 w-6 h-6 bg-wm-superblack border-4 border-gray-100 rounded-full animate-bounce"></div>
      </button>

    </div>
  `
})
export class App {
  // Configuración Externa
  @Input('api-key') apiKey = 'test_key_rm3_2026';
  @Input('tenant') tenantName = 'Tenant de Prueba';
  @Input('assistant-name') assistantName = 'Asistente Digital';
 
  // Reactividad UI
  isOpen = signal(false);
  isExpanded = signal(false);
  isLoading = signal(false);
  messages = signal<UiMessage[]>([]);
  currentPrompt = '';

  // Gestión de Sesión — persiste durante la vida del widget en la página
  private sessionId = signal<string | undefined>(undefined);

  private chatSvc = inject(ChatService);

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  toggleExpand(event: Event) {
    event.stopPropagation();
    this.isExpanded.set(!this.isExpanded());
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // TODO: Mostrar algún mini-toast si es necesario
  }

  /** Resetea la conversación iniciando una sesión nueva en el próximo request */
  resetSession() {
    this.sessionId.set(undefined);
    this.messages.set([]);
    this.currentPrompt = '';
  }
 
  sendQuery() {
    if (!this.currentPrompt.trim()) return;

    // 1. Mostrar burbuja del usuario inmediatamente e indicar cargando
    const userText = this.currentPrompt.trim();
    this.messages.update(msgs => [...msgs, { text: userText, sender: 'user' }]);
    this.currentPrompt = '';
    this.isLoading.set(true);

    // 2. Disparar Petición pasando el sessionId actual (undefined si es la primera)
    this.chatSvc.enviarBurbuja(userText, this.apiKey, this.sessionId()).subscribe({
      next: (response) => {
        // 3. Guardar el session_id retornado por el backend para continuidad
        this.sessionId.set(response.session_id);

        // 4. Agregar respuesta del asistente con sus fuentes al historial visual
        this.messages.update(msgs => [
          ...msgs,
          { text: response.respuesta, sender: 'ai', sources: response.fuentes },
        ]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('API Error', err);
        const errMsg = err.status === 401
          ? 'Clave de seguridad Tenant_ID inválida o no provista en el widget.'
          : 'Ocurrió un error conectando a las bases de conocimiento locales.';
        this.messages.update(msgs => [...msgs, { text: errMsg, sender: 'ai' }]);
        this.isLoading.set(false);
      }
    });
  }
}
