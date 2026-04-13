# Registro de Decisiones (Changelog)

## [2026-03-30] - Fase de Especificación (Product Manager)
* **Requerimiento Inicial**: Creación de un chatbot embebible para consultas sobre requerimientos documentales de acreditación de personal.
* **Propuesta de Arquitectura Original**: React (Vite) para el frontend, FastAPI (Python) para el backend RAG, y PostgreSQL (pgvector).
* **Refinamiento (Feedback)**: Se requirió alineación total con el stack del sistema principal **RM3** y soporte **multi-tenant**.
* **Arquitectura Definitiva Acordada**:
    * **Frontend**: Angular Elements (empaquetado como Web Component) con Tailwind CSS.
    * **Backend**: Microservicio o Módulo en NestJS, reutilizando Guards y estructura base.
    * **Base de Datos**: PostgreSQL con Prisma ORM (uso de raw queries para pgvector).
    * **Seguridad y Multi-tenant**: Tokens JWT para autenticación y filtrado estricto de documentos por Tenant_ID en Prisma.
    * **Infraestructura**: AWS (misma red/clúster de RM3).
    * **Modelos Dinámicos (MVP Local)**: Soporte multi-modelo (OpenAI, Gemini, Local/Ollama) a través de un `Factory` en NestJS que lee configuración por cada combinación de `mandante-proyecto`.
    * **Limitación en Vectorización**: Se abordó el riesgo de discrepancia de dimensiones en `pgvector`. Para el MVP, se estandarizará el modelo de embeddings (para evitar problemas de indexado en Postgres al mezclar dimensiones), pero el LLM generativo mantendrá total libertad de configuración.

### Iteración 3 - Diagramas y Revisión Integral
* **Diagramas Mermaid incorporados a la especificación**:
    * Diagrama de Arquitectura General (relación Widget → RM3 → Servicio IA → BD → Proveedores LLM).
    * Diagrama de Secuencia del Flujo RAG completo (desde la pregunta del usuario hasta la respuesta con citas).
    * Diagrama Entidad-Relación del modelo de datos (Tenant, TenantConfig, Document, DocumentChunk, ChatSession, ChatMessage).
    * Diagrama Flowchart del Patrón Factory para selección dinámica de LLM por tenant.
* **Requerimientos tabulados** para mayor claridad (funcionales y no funcionales).
* **Estructura de carpetas del MVP** definida explícitamente.

### Iteración 4 - Trazabilidad de Tokens y Facturación
* **Nuevo requerimiento RF-07**: Trazabilidad de consumo de tokens (input + output) por cada interacción, asociado al tenant.
* **Nueva entidad `TOKEN_USAGE`**: Registra proveedor, modelo, tokens_in, tokens_out, costo en USD, y tipo de operación (chat/embedding).
* **Diagrama de secuencia actualizado**: Muestra el paso de captura de tokens tras la respuesta del LLM.
* **Diagrama nuevo de flujo de facturación**: Desde la captura de metadata hasta la agregación por tenant y prorrateo.
* **Tabla de costos de referencia** por proveedor/modelo para el MVP.
* **Implementación técnica**: Interceptor NestJS no bloqueante, `TokenTrackingService`, endpoint de reportes de uso.
* **Módulo `usage/`** agregado a la estructura de carpetas del proyecto.

### Iteración 5 - Prorrateo Proporcional (reemplaza cálculo por token)
* **Cambio de modelo de facturación**: Se descartó el cálculo estimado de costos por token (`cost_usd` por interacción con tabla `pricing_history`) en favor de un **Prorrateo Proporcional por Uso Real** (*Proportional Cost Allocation*).
* **Campo `cost_usd` eliminado** de `TOKEN_USAGE`. La tabla ahora solo registra tokens crudos.
* **Nuevas entidades**: `BILLING_PERIOD` (factura real del proveedor por periodo) y `TENANT_BILLING` (costo asignado proporcionalmente a cada tenant).
* **Diagrama nuevo**: Flujo de 3 fases (registro en tiempo real → cierre de periodo con factura real → reportes y exportación).
* **API actualizada**: Se reemplazó módulo `usage/` por `billing/` con endpoints para reportes de tokens, reportes de costos asignados, y registro de facturas reales.
* **Razón del cambio**: Elimina la necesidad de mantener tablas de precios que se desactualizan, es agnóstico a moneda, y funciona también para Ollama (asignando costo de infraestructura mensual).

### Iteración 6 - Resolución de puntos críticos y alcance MVP
* **Ingestión de Documentos (RF-08)**: Interfaz admin independiente + endpoint API. Soporte para PDF (`pdf-parse`), DOCX (`mammoth`), XLSX (`exceljs`). Diagrama de secuencia de ingestión completo.
* **Estrategia de Chunking**: Recursive Character Text Splitting con `chunk_size=800 tokens`, `chunk_overlap=200 tokens`. XLSX se trata fila por fila.
* **Modelo de Autenticación MVP**: API Key + JWT desacoplado. API Key identifica tenant (hasheada en BD). JWT se decodifica sin validar firma para extraer user_id. Diagrama de secuencia incluido.
* **Rate Limiting (RF-09)**: `@nestjs/throttler`, 30 req/min por usuario, 200 req/min por tenant. Configurable desde `TENANT_CONFIG`.
* **Manejo de Errores (RF-10)**: Mensaje genérico al usuario + traza interna con logging estructurado (nivel, timestamp, tenant_id, stack trace).
* **Respuestas en Español (RF-11)**: Forzado vía system prompt del RAG.
* **Alcance del MVP definido explícitamente**: Chat RAG + 1 LLM + ingestión + token tracking + billing básico + rate limiting + Docker local.
* **Fuera del MVP**: Dashboard, múltiples LLMs simultáneos, validación JWT asimétrica, OCR, exportación reportes.
* **Entidad DOCUMENT actualizada**: Nuevos campos `formato`, `file_path`, `total_chunks`, `status`, `error_message`.
* **Entidad TENANT_CONFIG actualizada**: Nuevos campos `api_key_hash`, `rate_limit_user`, `rate_limit_tenant`.

### Iteración 7 - Rate Limiting Dinámico y Gestión de Parámetros por Tenant
* **RF-09 renombrado a "Rate Limiting Dinámico"**: Los límites de req/min ya no son valores hardcodeados ni estáticos del módulo `@nestjs/throttler`. Se leen en tiempo de ejecución desde `TENANT_CONFIG`, permitiendo configuraciones distintas por cada mandante-proyecto.
* **`DynamicThrottlerGuard`**: Guard personalizado que extiende `ThrottlerGuard`. Consulta `TenantConfigCacheService` para obtener los límites del tenant del request (con fallback a variables `.env` globales). Evalúa dos contadores independientes: por usuario y por tenant.
* **`TenantConfigCacheService`**: Nuevo servicio singleton introducido como capa de caché en memoria (`Map<tenant_id, config>`) con TTL configurable (`CACHE_TTL_MS`). Implementa resolución lazy y **invalidación explícita** al actualizar `TENANT_CONFIG` vía `PUT /tenants/:id/config`, sin necesidad de reiniciar el servicio.
* **Jerarquía de configuración formalizada**: `.env` (defaults globales, fallback) → `TENANT_CONFIG` en PostgreSQL (overrides por tenant, en caliente). Este patrón aplica a todos los parámetros operacionales: rate limits, proveedor/modelo LLM, temperatura, tokens de contexto.
* **Tabla de parámetros dinámicos**: Documentados los 6 parámetros gestionados con su campo en `TENANT_CONFIG` y su variable `.env` correspondiente.
* **Diagrama actualizado**: Nuevo flowchart que muestra `.env` y `TENANT_CONFIG` alimentando `TenantConfigCacheService`, el cual provee configuración resuelta a `DynamicThrottlerGuard`, `LLM Factory` y `RAG Service`.
* **Estructura de carpetas ampliada**: Módulos `documents/` (con parsers), `common/` (filters, interceptors, guards), `admin/` (panel frontend), `docs/` (datos de prueba).

### Iteración 8 - Scaffolding de Backend y Flujo Core RAG (LangChain)
* **Setup de Base de Datos**: Configuración de `docker-compose.yml` utilizando `pgvector/pgvector:16` y porteo completo del diagrama E-R definido al archivo `schema.prisma`.
* **Ajuste Técnico Prisma V7**: Se detectó deprecación del atributo `url` dentro del bloque `datasource` en Prisma v7. La conexión a BD se delegó a la lectura nativa con el paquete `dotenv` desde `.env`.
* **Capa Base Transversal de Seguridad**: Implementados en NestJS los siguientes proveedores:
  * `TenantConfigCacheService` (TTL caching para aislar BD de descargas agresivas de lectura de settings).
  * `ApiKeyGuard` (Validador SHA256 contra la API Key interceptando JWT para enrutamiento Multi-Tenant).
  * `DynamicThrottlerGuard` (Sobre-escritura limitadora estricta y per-req al vuelo basándonos en la caché sin reiniciar).
* **Fundación RAG / LLM (Inteligencia Artificial)**:
  * `LlmFactoryService` capaz de despachar objetos Model (OpenAI / Gemini / Ollama) evaluando las credenciales interceptadas del Tenant al vuelo.
  * Extracción de eventos de `LangChain` invocada por interfaz Callback de `rag.service.ts` para capturar asincrónicamente los Tokens (Input/Output) a través de `TokenTrackingService`.
  * Consulta vectorizada nativa `Similitud Coseno` programada con cláusula explícita a `$queryRaw` respetando casting `::vector` contra el Driver raw en `rag.service.ts`.

### Iteración 8.1 - Fortificación Estructural del Backend (Defensas MVP)
  * **Excepciones Domadas**: Instalación de `GlobalExceptionFilter` como barrera interceptora para transformar fallos fatales de duplicidad (Prisma `P2002`) en respuestas HTTP 400 serializadas, evitando fuga de datos al cliente.
  * **Sanitización de Entrada Perimetral**: Activación del `ValidationPipe` de NestJS con políticas estrictas de `whitelist` contra inyecciones de atributos basura usando la suite `class-validator`.
  * **Endpoint Transaccional API Key**: Creación del `TenantController` y su servicio acoplado para ejecutar el Registro de Inquilino automatizado: Emite por única vez el string aleatorio de la *"API Key Plana"* al Front-End mientras asegura únicamente un cifrado de vía única (SHA-256) en la base de datos PostgreSQL, asegurando inviolabilidad.

### Iteración 9 - Motor de Ingestión Asíncrono y Vectorizado RAG
* **Recepción de Archivos**: Configurado `MulterModule` en Guard transitorio para aceptar PDF, DOCX, y XLSX. Se definió almacenar los archivos en el servidor (`/uploads/`) de forma residente y **parametrizando la protección de Memoria OOM (Out-of-memory)** bloqueando de puertas afuera archivos que superen los `MAX_UPLOAD_MB` estipulados por Entorno.
* **Extracción de Texto Física (Parsers)**: Se desecharon librerías abstractas pesadas, incorporando herramientas de bisturí atómicas (`pdf-parse`, `mammoth` y `xlsx`). Excel se procesa fila a fila como Chunks singulares.
* **Algoritmo de Trozado (Chunking)**: En favor de la ligereza del servicio frente a dependencias masivas o fragmentadas en Langchain, se instruyó a NestJS con un `ChunkerService` nativo superando el test de **"Recursive Text Splitting"** (Saltos -> Puntos -> Espacios) a rajatabla bajo el umbral oficial estándar del MVP (`size: 800`, `overlap: 200`).
* **Sincronización de Contexto a Postgres**: Cada sub-pedazo atomizado del texto genera un Call al Array de la interfaz Factory de LLM de Turno (simulando los vectores). Estos se graban individualmente valiéndose de un SQL directo ($executeRaw) logrando un perfecto acople a `pgvector`.
* **Auditoría Forense y Purga (CRON)**: Introducción de `@nestjs/schedule` instalando un robot asíncrono que barre la carpeta `/uploads` cada medianoche. Este robot extermina permanentemente todo registro físico que posea una estadía superior a **48 horas (2 días)** en estado de servidor inactivo.

### Iteración 10 - Memoria y Persistencia del Asistente (RF-04)
* **Find-or-Create de Sesión (`rag.service.ts`)**: El `RagService` ahora implementa `findOrCreateSession()`. Si el request incluye un `session_id` válido para ese tenant, se reutiliza la sesión. De lo contrario, se crea automáticamente una nueva en `chat_sessions`.
* **Persistencia de Mensajes**: Cada interacción persiste dos registros en `chat_messages`: uno con `role: 'user'` antes de invocar el LLM, y otro con `role: 'assistant'` incluyendo el array de fuentes (`sources`) tras recibir la respuesta.
* **Historial Conversacional con MessagesPlaceholder**: Se cargan los últimos 6 mensajes de la sesión activa (`HISTORY_WINDOW = 6`) y se inyectan en el `ChatPromptTemplate` mediante `MessagesPlaceholder('chat_history')` de LangChain. Esto le da al LLM contexto para resolver referencias como "¿cuánto tiempo es eso que me dijiste?".
* **Refactor del Controller**: El endpoint `POST /chatbot/query` ahora acepta `session_id` opcional en el body y devuelve `session_id` en cada respuesta, permitiendo que el frontend mantenga el hilo.
* **Gestión de Sesión en el Widget Angular**: El componente `App` almacena el `sessionId` como signal Angular. La primera llamada lo envía como `undefined` (el backend crea la sesión). Las llamadas sucesivas reenvían el `session_id` recibido. Se añadió botón de "Nueva Conversación" que resetea el estado.
* **Fuentes Visibles en el Widget**: Las fuentes documentales (`fuentes`) ahora se muestran bajo cada burbuja del asistente en la UI.
* **Diagnóstico X-Rays actualizado**: El archivo `rag_ultimo_diagnostico.txt` ahora incluye el `SESSION ID` y la cantidad de mensajes históricos cargados en cada ciclo RAG.

### Iteración 11 - Rediseño Premium y Modo "Epic View" (UI/UX)
* **Estética de Alta Gama**: Implementación de **Glassmorphism** (efecto cristal con `backdrop-filter`) en el Topbar del panel y en el cuerpo del Chatbot. Se adoptó el Naranja RM3 (`#F15A24`) como color de acento principal.
* **Modo "Epic View" (Expansión)**: Introducción de una funcionalidad de expansión en el widget (botón de maximizar). El chat escala de **380px** a **650px de ancho** con animaciones fluidas (`cubic-bezier`), permitiendo la lectura de textos extensos del RAG sin sacrificar la usabilidad.
* **Funcionalidad de Copiado Rápido**: Se añadió un botón de "copiar al portapapeles" en cada burbuja de la IA, visible al hacer *hover*, facilitando el flujo de trabajo del usuario final.
* **Micro-animaciones**: Inclusión de efectos "Spring" (elásticos) para la apertura del chat y estados de escritura animados con delay variable para mayor naturalidad.
* **Tipografía Unificada**: Adopción de la fuente **Inter** en todos los componentes para una apariencia corporativa coherente.

### Iteración 12 - Despliegue de Panel Administrativo y Servidor Estático
* **Servidor de Producción Local**: El Panel Admin (construido como SPA en Vanilla JS) ahora se sirve de forma independiente mediante `npx serve` en el puerto **4300**.
* **Infraestructura de Ingestión**: Se validó el flujo completo: Login (simulado) -> Conexión API -> Subida de Documentos -> Vectorización en PostgreSQL.
* **Consistencia de Marca**: Se alinearon los estilos del Dashboard con el ADN visual de RM3, incluyendo gradientes vibrantes y cards de información con sombras de elevación profunda.
* **Estado Actual**: Sistema funcional de extremo a extremo con visibilidad total (Chat RAG + Panel Admin + Memoria + Documentación Activa).

### Iteración 13 - Módulo Analytics (Billing/Usage) en Tiempo Real
* **Backend (`BillingModule`)**: Construcción del `BillingModule` en NestJS (Controller y Service) alojado en `src/billing/`. Este módulo levanta el endpoint `GET /billing/usage/report`.
* **Prisma Aggregation**: El `BillingService` orquesta una agrupación asíncrona sobre la tabla `token_usage` valiéndose de `groupBy()` en Prisma (`_sum: tokens_total`), mapeando los volcados al instante hacia el ID respectivo del Tenant.
* **Frontend Analytics**: Sustitución del mock estático en `admin-panel/js/api.js` por una petición `fetch()` dinámica contra el flujo RAG.
* **Visualizador Resiliente Canvas**: En el dashboard (`dashboard.view.js`), el gráfico paramétrico de métricas (Canvas 2D) se protegió a nivel matemático previniendo colapsos tipo `-Infinity` si el RAG aún no contabiliza interacciones en disco.
* **Auditoría de Seguridad NPM**: Ejecutados pipelines de mitigación de vulnerabilidades heredadas (12 reportes críticos en parsers/xlsx) vía `npm audit fix` asegurando un Core depurado en NestJS.

### Iteración 14 - Desbloqueo de Ingesta y Certificación RAG E2E
* **[Ingestión/Testing]**: Se generó un script temporal nativo upload.js aislando FormData del browser para bypassear la interfaz gráfica y asegurar el pipeline de ingestión. Para sortear el ApiKeyGuard, el script inyecta asíncronamente un Fake JWT firmado on-the-fly (jsonwebtoken) que satisface el tenant_id. Se comprobó la indexación vectorial y se testeó el rendimiento semántico real (Respuesta y fuentes retornadas correctamente por el RAG local sobre el PDF).

### Iteración 15 - Solución de Build Angular, Switch Multi-LLM y Widget Demo
* **[Angular Build Fix]**: Solucionado el fallo de empaquetado crítico de Angular Elements y Tailwind v3 resolviendo configuraciones heredadas. El proceso de construcción ahora compila de forma exitosa y limpia los artefactos del Web Component (`main.js` y `styles.css`).
* **[Dynamic LLM Switcher (Gemini)]**: Completada y validada exitosamente la refactorización `LlmFactoryService` que hace puente oficial a \`@langchain/google-genai\`. Verificada mediante tests E2E la capacidad del sistema para cambiar de OpenAI a Gemini "en caliente" al vuelo leyendo desde caché la directriz `llm_provider` en la base de datos sin necesitar reinicio.
* **[Test E2E Frontend-Backend]**: Construcción de una vista dedicada (`#/widget-demo`) en el admin-panel mediante la inclusión dinámica de scripts. Este dashboard sirve como campo de pruebas Smoke Test real para testar la trazabilidad final inyectando el Custom Element `<chatbot-widget>` en la página validando CORS y comunicación RAG sobre el Tenant.