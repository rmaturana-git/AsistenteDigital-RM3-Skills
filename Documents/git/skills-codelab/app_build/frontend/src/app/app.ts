import {
  Component, ChangeDetectionStrategy, signal, Input, inject,
  ViewChild, ElementRef, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatService } from './chat.service';

interface UiMessage {
  html: SafeHtml;
  raw: string;
  sender: 'ai' | 'user';
  sources?: string[];
}

@Component({
  selector: 'chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      --rm3-orange: #F15A24;
      --glass-bg: rgba(255, 255, 255, 0.88);
      --ai-bubble: rgba(243, 244, 246, 0.95);
      --user-gradient: linear-gradient(135deg, #F15A24 0%, #ff8c42 100%);
      font-family: 'Inter', sans-serif;
      display: block;
    }

    /*
     * Panel principal: overflow:hidden + border-radius recorta todos los hijos.
     * Se fuerza la aceleración GPU con will-change para que el clip funcione
     * correctamente en combinación con CSS transform (scale, translate).
     */
    .chat-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
      border-radius: 24px;
      overflow: hidden;
      will-change: transform;
      isolation: isolate;               /* nuevo contexto de apilamiento */
      transition: all 0.45s cubic-bezier(0.19, 1, 0.22, 1);
      display: flex;
      flex-direction: column;
      transform-origin: bottom right;
    }

    /* Header: esquinas superiores redondeadas explícitas como respaldo visual */
    .chat-header {
      flex-shrink: 0;
      background: linear-gradient(90deg, #111111 0%, #272727 100%);
      border-bottom: 2px solid var(--rm3-orange);
      border-radius: 22px 22px 0 0;     /* coincide con panel -2px de borde */
    }

    /* Zona de scroll */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      scroll-behavior: smooth;
    }

    /* Footer input */
    .chat-footer {
      flex-shrink: 0;
      padding: 1.1rem 1.25rem 1rem;
      background: rgba(255,255,255,0.55);
      border-top: 1px solid rgba(0,0,0,0.06);
      backdrop-filter: blur(8px);
    }

    .bubble-user {
      background: var(--user-gradient);
      box-shadow: 0 4px 15px rgba(241, 90, 36, 0.28);
      border-radius: 18px 18px 4px 18px;
      color: #fff;
    }

    .bubble-ai {
      background: var(--ai-bubble);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 18px 18px 18px 4px;
      color: #1f2937;
      line-height: 1.6;
    }

    /* Markdown dentro de la burbuja IA */
    .bubble-ai strong { font-weight: 700; }
    .bubble-ai em     { font-style: italic; }
    .bubble-ai code   { background: rgba(0,0,0,0.07); padding: 1px 5px; border-radius: 3px; font-size: 0.88em; font-family: monospace; }

    .animate-in {
      animation: springIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes springIn {
      from { opacity: 0; transform: scale(0.9) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0);      }
    }

    .typing-dot {
      width: 6px; height: 6px; background: #9ca3af; border-radius: 50%;
      animation: jump 0.6s infinite alternate;
    }
    @keyframes jump { to { transform: translateY(-4px); opacity: 0.4; } }
    .d1 { animation-delay: 0.15s; }
    .d2 { animation-delay: 0.30s; }

    .source-tag {
      background: rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 5px;
      padding: 2px 7px;
      font-size: 0.7rem;
      color: #6b7280;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .btn-header {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 6px;
      color: white;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      line-height: 1;
    }
    .btn-header:hover { background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5); }

    .btn-copy {
      position: absolute;
      top: 4px; right: -32px;
      opacity: 0;
      padding: 5px;
      background: rgba(255,255,255,0.8);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 6px;
      color: #6b7280;
      cursor: pointer;
      transition: opacity 0.25s, color 0.2s;
    }
    .bubble-wrap:hover .btn-copy { opacity: 1; }
    .btn-copy:hover { color: #F15A24; }

    .chat-input {
      width: 100%;
      background: rgba(243,244,246,0.85);
      border: 2px solid transparent;
      border-radius: 18px;
      padding: 0.75rem 3.5rem 0.75rem 1.1rem;
      font-size: 0.875rem;
      color: #111827;
      outline: none;
      transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .chat-input:focus {
      background: #fff;
      border-color: rgba(241,90,36,0.35);
      box-shadow: 0 0 0 3px rgba(241,90,36,0.08);
    }
    .chat-input:disabled { opacity: 0.5; }

    .btn-send {
      position: absolute;
      right: 6px; top: 50%; transform: translateY(-50%);
      width: 42px; height: 42px;
      background: #F15A24;
      border-radius: 14px;
      border: none;
      color: white;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(241,90,36,0.3);
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .btn-send:hover  { background: #d44d1c; }
    .btn-send:active { transform: translateY(-50%) scale(0.9); }
    .btn-send:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }

    .fab {
      width: 72px; height: 72px;
      background: #F15A24;
      border-radius: 24px;
      border: none;
      color: white;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 30px rgba(241,90,36,0.35);
      transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.3s;
      position: relative;
    }
    .fab:hover  { transform: scale(1.1) rotate(-3deg); box-shadow: 0 12px 40px rgba(241,90,36,0.45); }
    .fab:active { transform: scale(0.95); }

    .fab-badge {
      position: absolute;
      top: -4px; right: -4px;
      width: 18px; height: 18px;
      background: #111;
      border: 3px solid #f3f4f6;
      border-radius: 50%;
      animation: bounce 1s infinite;
    }
    @keyframes bounce {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-4px); }
    }
  `],
  template: `
    <div style="position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:20px">

      <!-- ░░ Panel de Chat ░░ -->
      <div
        class="chat-panel"
        [style.width]="isExpanded() ? '680px' : '380px'"
        [style.height]="isExpanded() ? '760px' : '560px'"
        [style.maxHeight]="'calc(100vh - 100px)'"
        [style.opacity]="isOpen() ? '1' : '0'"
        [style.transform]="isOpen() ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(20px)'"
        [style.pointerEvents]="isOpen() ? 'all' : 'none'"
      >
        <!-- Header -->
        <div class="chat-header text-white p-4 flex justify-between items-center relative" style="overflow:hidden">
          <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:#F15A24;opacity:0.08;filter:blur(30px);border-radius:50%"></div>

          <div style="display:flex;align-items:center;gap:12px;z-index:1">
            <div style="width:40px;height:40px;background:#F15A24;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="color:white;font-weight:900;font-size:1rem;letter-spacing:-1px">RM3</span>
            </div>
            <div>
              <div style="font-weight:700;font-size:0.95rem;line-height:1.2">{{ assistantName }}</div>
              <div style="font-size:0.68rem;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">{{ tenantName }}</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;z-index:1">
            <button class="btn-header" (click)="toggleExpand($event)" [title]="isExpanded() ? 'Reducir' : 'Expandir'">
              <svg *ngIf="!isExpanded()" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
              <svg *ngIf="isExpanded()"  width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 9L4 4m0 0h5m-5 0v5m16-5l-5 5m5-5v5m0 0h-5M9 15l-5 5m0 0h5m-5 0v-5m16 5l-5-5m5 5v-5m0 5h-5"/></svg>
            </button>
            <button class="btn-header" (click)="resetSession()" title="Nueva conversación">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            </button>
            <button class="btn-header" (click)="toggleChat()">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Mensajes -->
        <div #chatMessages class="chat-messages">

          <div class="self-start animate-in" style="max-width:90%">
            <div class="bubble-ai" style="padding:14px 16px;font-size:0.875rem">
              ¡Hola! Soy tu asistente de RM3. Estoy conectado a tu base de conocimientos para resolver dudas sobre acreditación.
            </div>
          </div>

          <ng-container *ngFor="let msg of messages()">
            <div [ngClass]="msg.sender === 'ai' ? 'self-start animate-in' : 'self-end animate-in'"
                 [style.maxWidth]="msg.sender === 'ai' ? '92%' : '86%'"
                 [style.alignSelf]="msg.sender === 'ai' ? 'flex-start' : 'flex-end'">

              <div class="bubble-wrap" style="position:relative">
                <div [ngClass]="msg.sender === 'ai' ? 'bubble-ai' : 'bubble-user'"
                     style="padding:12px 15px;font-size:0.875rem"
                     [innerHTML]="msg.html">
                </div>
                <button *ngIf="msg.sender === 'ai'" class="btn-copy" (click)="copyToClipboard(msg.raw)">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                </button>
              </div>

              <div *ngIf="msg.sender === 'ai' && msg.sources?.length" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
                <span *ngFor="let src of msg.sources" class="source-tag">📄 {{ src }}</span>
              </div>
            </div>
          </ng-container>

          <!-- Typing indicator -->
          <div *ngIf="isLoading()" style="align-self:flex-start;margin-top:4px">
            <div style="display:inline-flex;gap:5px;padding:10px 16px;background:rgba(243,244,246,0.9);border-radius:30px;align-items:center">
              <div class="typing-dot"></div>
              <div class="typing-dot d1"></div>
              <div class="typing-dot d2"></div>
            </div>
          </div>
        </div>

        <!-- Input Footer -->
        <div class="chat-footer">
          <div style="position:relative">
            <input
              #queryInput
              class="chat-input"
              type="text"
              [(ngModel)]="currentPrompt"
              (keydown.enter)="sendQuery()"
              [disabled]="isLoading()"
              placeholder="Escribe tu consulta aquí..."
            >
            <button class="btn-send" (click)="sendQuery()" [disabled]="isLoading() || !currentPrompt.trim()">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transform:rotate(-15deg)">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
          <div style="text-align:center;margin-top:10px;font-size:0.62rem;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;display:flex;align-items:center;justify-content:center;gap:6px">
            <span style="width:6px;height:6px;background:#22c55e;border-radius:50%;animation:pulse 2s infinite"></span>
            RM3 RAG Engine · Powered by Gemini
          </div>
        </div>
      </div>

      <!-- ░░ FAB ░░ -->
      <button class="fab" (click)="toggleChat()">
        <svg *ngIf="!isOpen()" width="36" height="36" fill="none" stroke="white" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        <svg *ngIf="isOpen()"  width="36" height="36" fill="none" stroke="white" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        <div *ngIf="!isOpen()" class="fab-badge"></div>
      </button>

    </div>
  `
})
export class App {
  @Input('api-key')        apiKey        = '';
  @Input('tenant')         tenantName    = '';
  @Input('assistant-name') assistantName = 'Asistente Digital';

  isOpen     = signal(false);
  isExpanded = signal(false);
  isLoading  = signal(false);
  messages   = signal<UiMessage[]>([]);
  currentPrompt = '';

  @ViewChild('chatMessages') private chatMessagesRef!: ElementRef<HTMLDivElement>;
  @ViewChild('queryInput')   private queryInputRef!:   ElementRef<HTMLInputElement>;

  private chatSvc   = inject(ChatService);
  private sanitizer = inject(DomSanitizer);
  private sessionId = signal<string | undefined>(undefined);

  constructor() {
    // Auto-scroll confiable: se ejecuta DESPUÉS de que Angular pinta los nuevos mensajes.
    // El doble requestAnimationFrame garantiza que el DOM esté completamente pintado.
    effect(() => {
      this.messages();    // suscripción al signal
      this.isLoading();   // también cuando aparece/desaparece el typing indicator
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = this.chatMessagesRef?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      });
    });
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) this.focusInput(150);
  }

  toggleExpand(e: Event) {
    e.stopPropagation();
    this.isExpanded.set(!this.isExpanded());
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  resetSession() {
    this.sessionId.set(undefined);
    this.messages.set([]);
    this.currentPrompt = '';
    this.focusInput(50);
  }

  sendQuery() {
    const text = this.currentPrompt.trim();
    if (!text || this.isLoading()) return;

    this.messages.update(m => [...m, { html: this.renderText(text, false), raw: text, sender: 'user' }]);
    this.currentPrompt = '';
    this.isLoading.set(true);

    this.chatSvc.enviarBurbuja(text, this.apiKey, this.sessionId()).subscribe({
      next: (res) => {
        this.sessionId.set(res.session_id);
        this.messages.update(m => [...m, {
          html:    this.renderText(res.respuesta, true),
          raw:     res.respuesta,
          sender:  'ai',
          sources: res.fuentes
        }]);
        this.isLoading.set(false);
        this.focusInput(50);
      },
      error: (err) => {
        const msg = err.status === 401
          ? 'Clave de seguridad inválida o no provista.'
          : 'Error al conectar con el servidor RAG.';
        this.messages.update(m => [...m, { html: this.renderText(msg, true), raw: msg, sender: 'ai' }]);
        this.isLoading.set(false);
        this.focusInput(50);
      }
    });
  }

  /**
   * Convierte texto plano (con markdown básico) a SafeHtml.
   * - Nunca usa `*text*` → em (evita romper listas con asterisco)
   * - `**texto**` → <strong>
   * - `* ítem` o `- ítem` al inicio de línea → "• ítem"
   * - backticks → <code>
   * - \n → <br>
   */
  private renderText(raw: string, isAi: boolean): SafeHtml {
    if (!raw) return this.sanitizer.bypassSecurityTrustHtml('');

    // 1. Escapar HTML primero para evitar XSS
    let s = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (!isAi) {
      // Mensaje del usuario: preservar saltos de línea, sin formato extra
      return this.sanitizer.bypassSecurityTrustHtml(s.replace(/\n/g, '<br>'));
    }

    // 2. Bold: **texto** (debe preceder al manejo de asteriscos simples)
    s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

    // 3. Bullets: líneas que empiezan con "* " o "- " → "• "
    //    Funciona tanto si están al inicio de línea como tras \n
    s = s.replace(/(^|\n)\*\s+/g, '$1• ');
    s = s.replace(/(^|\n)-\s+/g,  '$1• ');

    // 4. Inline code
    s = s.replace(/`([^`\n]+)`/g,
      '<code>$1</code>');

    // 5. Saltos de línea
    s = s.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(s);
  }

  private focusInput(delayMs = 80): void {
    setTimeout(() => {
      this.queryInputRef?.nativeElement?.focus();
    }, delayMs);
  }
}
