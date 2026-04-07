# Handoff - RM3 Project State

## 📅 Qué hice hoy:
- **Troubleshooting de API Key Frontend**: Se resolvió la anomalía de "Cruce de Tenants" en la demo. El widget Chatbot de Angular local estaba fallando al leer el atributo `api-key` del DOM huésped en el `index.html`, haciendo *fallback silente* a la clave `test_key_...` original (y enlazando al "Proyecto de Prueba" con base de datos de Techint).
- **Hardcodeo Defensivo**: Para salvar la sesión de demostración de manera inmediata, se inyectó a fuego la llave de "Puerto Angamos" (`rm3_856...`) en el core del componente `app.ts`.
- **Refactorización de Meta-Arquitectura (Agentes)**: Se crearon directivas explícitas de QA y se configuró una nueva Skill aislada en `.agents/skills/web-development/SKILL.md`. Establecimos las reglas *"Zero Hardcoded Fallbacks"* y *"E2E WebComponent Testing Protocol"* para prevenir que futuros Agentes usen flags locales que nublen la visibilidad de los binds en el navegador y limpiamos el `agents.md` (Separation of Concerns).

## ⚠️ Qué quedó a medias:
- El parche de inyección en duro de la llave API en `frontend/src/app/app.ts` (`@Input('api-key') apiKey = 'rm3...';`) es extremadamente indeseable según nuestro propio SKILL.
- **Flujo Pausado Antiguo:** Sigue inactiva la migración e implementación arquitectónica del multi-soporte LLM para el backend (LLM Factory: Gemini, Claude, Ollama) y el eventual `npx prisma migrate dev` para las dimensiones vectoriales variables.
- Falta la conexión de ingesta definitiva (interfaz Web que reemplace nuestro `_scratch/upload.js`).

## 🎯 Próximo paso exacto:
Al ejecutar `/resume`:
1. El Agente Principal (@engineer) DEBE purgar urgentemente el archivo `frontend/src/app/app.ts` para eliminar el hardcodeo de la API Key. Debe arreglarse el binding del WebComponent/Angular Elements para que atrape variables limpias de un `index.html` host tal cual opera en producción corporativa, probándolo en E2E puro si es necesario.
2. Iniciar el rediseño del Multi-LLM provider en `llm-factory.service.ts` basándose en la pre-arquitectura debatida.
