Created At: 2026-04-21T17:20:00Z
File Path: `production_artifacts/handoff.md`

# Handoff - RM3 Project State

## 📅 Qué hice hoy (Sesión 2026-04-21):

### ✅ Completado con éxito
- **Smoke Test E2E realizado**: El usuario validó manualmente los 4 pasos del flujo completo (apertura del widget, Epic View, consulta RAG con Gemini 2.5 Flash, memoria conversacional). Todo el pipeline funcional pasó.
- **Fix Fuentes RAG (Backend)**: Se refactorizó la query SQL en `rag.service.ts` — se agregó un `JOIN` con la tabla `documents` para recuperar `d.titulo` (nombre real del archivo) en vez del fallback genérico. Validado: las "píldoras" ahora muestran el nombre del PDF real.
- **Cache Busting (Admin Panel)**: Descubierta la causa raíz crítica por la que todos los fixes anteriores del widget no se veían: `widget-demo.view.js` cargaba `main.js` con URL estática. Corregido con `?t=Date.now()` en el src del script y del CSS.

### ⚠️ Bugs de UX detectados — Requieren validación con el fix de caché activo

Se reescribió `app.ts` (Angular Elements) en múltiples iteraciones aplicando correcciones, pero dado el problema de caché recién descubierto, **NO se puede confirmar si las correcciones actuales funcionan o no**. Los bugs reportados son:

1. **Borde superior del panel desbordado**: El `border-radius` del panel (`glass-panel`) no clipea correctamente los bordes superiores del header. Último intento: `isolation: isolate + will-change: transform + border-radius explícito` en `.chat-header`.
2. **Sin scroll automático**: Al recibir una respuesta larga, el chat no hace scroll al fondo. Último intento: `effect()` + doble `requestAnimationFrame` sobre `chatMessagesRef.nativeElement.scrollTop`.
3. **Pérdida de foco del input**: Al enviar una pregunta, el foco se pierde del `<input>`. Último intento: `focusInput()` con `setTimeout(50ms)` en los callbacks `next` y `error`.
4. **Markdown sin procesar**: Las respuestas del LLM usan `**negrita**` y `* bullets` que se muestran como texto plano con asteriscos. Último intento: `DomSanitizer.bypassSecurityTrustHtml()` con regex corregido (`**text**` → `<strong>` y `* item` → `• item`).

### Archivos modificados esta sesión:
- `app_build/frontend/src/app/app.ts` — Múltiples reescrituras (ver Iteración 16 del changelog)
- `app_build/backend/src/chatbot/rag.service.ts` — JOIN con documents para fuentes reales
- `app_build/admin-panel/js/views/widget-demo.view.js` — Cache busting `?t=Date.now()`
- `production_artifacts/changelog.md` — Iteración 16 agregada

---

## ⚠️ Qué quedó a medias:

Los 4 bugs de UX del widget **pueden estar ya corregidos** en el código actual de `app.ts`, pero el usuario no pudo confirmar porque el bug de caché impedía cargar el nuevo bundle. La próxima sesión debe comenzar verificando esto.

**Estado del código actual en `app.ts`**:
- Usa `effect()` para scroll auto (Angular 17+ reactivo a signals)
- Usa `DomSanitizer` con `bypassSecurityTrustHtml` para markdown
- Usa inline styles en lugar de clases Tailwind para evitar conflictos de compilación
- Panel usa `isolation: isolate` + `will-change: transform` para clip correcto

---

## 🎯 Próximo paso exacto:

Al ejecutar `/resume`:

1. **@engineer debe verificar primero**: Con el cache busting ya aplicado, pedir al usuario hacer **Ctrl+F5** en `http://localhost:4300/#/widget-demo` (o abrir en ventana de incógnito) y evaluar si los 4 bugs persisten o ya están resueltos.

2. **Si los bugs persisten con el build limpio** (lo más probable, dada la complejidad), la estrategia correcta es:
   - **Cambiar el enfoque de debugging**: Abrir la consola del navegador (F12) e inspeccionar:
     a. ¿Se ejecuta el `effect()` hook? (agregar `console.log` temporal)
     b. ¿El `chatMessagesRef.nativeElement` está definido cuando se invoca?
     c. ¿El `[innerHTML]` está recibiendo el SafeHtml o texto plano?
   - Agregar logs diagnósticos temporales en `app.ts` antes de continuar ciegamente reescribiendo

3. **Plan alternativo para markdown** (si DomSanitizer falla): Usar `white-space: pre-wrap` con CSS + procesar el texto como texto plano sustituyendo `**texto**` → `texto` y `* item` → `• item` (sin HTML, evita por completo el sanitizador).

4. **Plan alternativo para scroll** (si ViewChild falla en Angular Elements): Usar `document.getElementById('chat-messages-scroll')` con `id` hardcoded en el div, bypaseando completamente `ViewChild`.
