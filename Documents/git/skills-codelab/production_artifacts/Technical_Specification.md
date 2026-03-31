# Especificación Técnica: Chatbot Embebido para Acreditación de Personal

## Resumen Ejecutivo
La solución propuesta es un **widget de chatbot** diseñado para ser embebido (integrado) dentro de la aplicación web **RM3** (Sistema de Acreditación de Trabajadores). Su propósito es asistir a los usuarios respondiendo preguntas específicas relacionadas con los **requerimientos documentales** necesarios para la acreditación de personal (ingreso de contratistas, acceso a faenas, normativas de seguridad, etc.).

El asistente utilizará una arquitectura **RAG (Retrieval-Augmented Generation)** para garantizar que las respuestas sean precisas y estén fundamentadas exclusivamente en las políticas y normativas vigentes proporcionadas, evitando alucinaciones del modelo.

La solución es **centralizada y multi-tenant**: una sola instancia del servicio IA sirve a todas las instancias de RM3, aislando los datos por cada combinación **mandante-proyecto**.

---

## Requerimientos

### Funcionales
| # | Requerimiento | Descripción |
|---|---|---|
| RF-01 | **Interfaz Embebible (Widget)** | Integración en RM3 mediante Web Component (Angular Elements) o `<script>` tag. |
| RF-02 | **Pregunta/Respuesta en Tiempo Real** | Interfaz tipo chat flotante con respuestas inmediatas basadas en IA. |
| RF-03 | **Base de Conocimiento RAG** | Respuestas fundamentadas estrictamente en documentación de acreditación cargada. Sin alucinaciones. |
| RF-04 | **Memoria de Conversación** | Mantener contexto (historial de mensajes) durante la sesión activa del usuario. |
| RF-05 | **Citas y Transparencia** | Indicar el documento o extracto en el cual se basó la respuesta (recomendado). |
| RF-06 | **LLM Dinámico por Tenant** | Permitir configurar el proveedor de LLM (OpenAI, Gemini, Ollama) por cada mandante-proyecto. |
| RF-07 | **Trazabilidad de Consumo de Tokens** | Registrar tokens crudos (input + output) por interacción y tenant. Al cierre de periodo, prorratear la factura real del proveedor según el porcentaje de uso de cada mandante-proyecto. |
| RF-08 | **Ingestión de Documentos** | Interfaz administrativa independiente para cargar documentos (PDF, DOCX, XLSX) por cada mandante-proyecto. Incluye endpoint API de ingestión con procesamiento automático (extracción de texto, chunking, vectorización). |
| RF-09 | **Rate Limiting Dinámico** | Protección contra abuso con límites configurables **por tenant** (req/min por usuario y por tenant). Los valores se leen desde `TENANT_CONFIG` en tiempo de ejecución. El `.env` define valores por defecto globales como fallback. |
| RF-10 | **Manejo de Errores con Trazabilidad** | Ante fallos del LLM o del sistema, mostrar mensaje genérico al usuario y registrar traza interna detallada para soporte. |
| RF-11 | **Respuestas en Español** | El LLM debe responder siempre en español, forzado mediante system prompt del RAG. |

### No Funcionales
| # | Requerimiento | Descripción |
|---|---|---|
| RNF-01 | **Aislamiento CSS/JS** | El widget no interfiere con los estilos ni scripts de la aplicación host RM3. |
| RNF-02 | **Rendimiento** | Tiempo de respuesta < 5 segundos. Bundle del widget ligero. |
| RNF-03 | **Diseño Responsivo** | Adaptación a dispositivos móviles y escritorio. |
| RNF-04 | **Escalabilidad** | Manejo de múltiples consultas concurrentes de distintos tenants. |
| RNF-05 | **MVP Local** | Ejecutable completamente en ambiente local con Docker Compose, sin dependencias de nube. |
| RNF-06 | **Logging Estructurado** | Todos los errores internos se registran con nivel, timestamp, tenant_id, y stack trace para diagnóstico. |
| RNF-07 | **Soporte Multi-formato** | Procesamiento de documentos PDF, DOCX y XLSX para ingestión en la base de conocimiento. |

---

## Arquitectura General

La arquitectura será 100% compatible con el ecosistema actual de **RM3**, diseñada de forma centralizada y multi-tenant.

```mermaid
graph TB
    subgraph "Instancias RM3 (por Mandante)"
        RM3_A["🏢 RM3 - Mandante A<br/>(Angular + NestJS)"]
        RM3_B["🏢 RM3 - Mandante B<br/>(Angular + NestJS)"]
        RM3_C["🏢 RM3 - Mandante C<br/>(Angular + NestJS)"]
    end

    subgraph "Widget Chatbot (Angular Element)"
        WIDGET["💬 Web Component<br/>chatbot-widget<br/>(envía API Key + JWT)"]
    end

    subgraph "Admin Panel"
        ADMIN["📁 Panel Administrativo<br/>(Carga de Documentos)"]
    end

    subgraph "Servicio IA Centralizado"
        AUTHG["🔑 API Key Guard<br/>(identifica tenant)"]
        API["🔧 NestJS API<br/>(Módulo IA)"]
        FACTORY["🏭 LLM Factory<br/>(selección dinámica)"]
        RAG["🧠 Motor RAG<br/>(LangChain.js)"]
        INGEST["📥 Motor Ingestión<br/>(PDF/DOCX/XLSX)"]
        TRACKER["📊 Token Tracker"]
        LIMITER["🚫 Rate Limiter"]
    end

    subgraph "Base de Datos Centralizada"
        PG["🗄️ PostgreSQL<br/>+ pgvector"]
    end

    subgraph "Proveedores LLM"
        OPENAI["OpenAI<br/>(GPT-4o-mini)"]
        GEMINI["Google<br/>(Gemini)"]
        OLLAMA["Ollama<br/>(Local/Gratuito)"]
    end

    RM3_A --> WIDGET
    RM3_B --> WIDGET
    RM3_C --> WIDGET
    WIDGET -- "HTTP + API Key + JWT" --> LIMITER
    LIMITER --> AUTHG
    AUTHG --> API
    API --> FACTORY
    FACTORY --> RAG
    RAG -- "Búsqueda vectorial<br/>filtrada por tenant" --> PG
    RAG --> OPENAI
    RAG --> GEMINI
    RAG --> OLLAMA
    RAG -- "tokens usados" --> TRACKER
    TRACKER -- "INSERT token_usage" --> PG
    ADMIN -- "Upload docs + API Key" --> INGEST
    INGEST -- "Chunking + Embedding" --> PG
```

---

### Frontend (Widget Embebible Angular)
*   **Framework**: **Angular** exportado como Web Component usando **Angular Elements**. Empaquetado en un único archivo `chatbot-widget.js` que se incrusta nativamente en el frontend de RM3.
*   **Estilos**: **Tailwind CSS** con prefijos para aislar utilidades y evitar colisiones con los estilos globales de RM3.
*   **Autenticación**: El widget recibe **API Key** (identifica tenant) + **JWT** (identifica usuario) desde la aplicación host.
*   **Manejo de Errores**: Ante cualquier fallo, muestra: *"No puedo responder en estos momentos. Si el problema persiste, contáctese con el administrador."* Internamente registra la traza completa.

### Panel Administrativo
*   Interfaz web independiente para el **administrador de la plataforma**.
*   Permite cargar documentos (PDF, DOCX, XLSX) asociándolos a un mandante-proyecto específico.
*   Muestra el estado de ingestión de cada documento (pendiente, procesando, listo, error).

### Backend (Servicio IA en NestJS)
*   **Framework API**: **NestJS**. Módulo dedicado para procesar la IA. Para el **MVP**, ejecutable sin dependencias de nube (Docker Compose + `.env`).
*   **ORM y Base de Datos**: **Prisma** → **PostgreSQL con pgvector**. Incluye entidad `TenantConfig` para configuraciones de IA exclusivas por cada mandante-proyecto.
*   **LLM Dinámico**: Soporte multi-proveedor (OpenAI, Gemini, Ollama). Patrón **Factory** con LangChain.js para instanciar el modelo correcto en tiempo de ejecución.
*   **Orquestación IA**: **LangChain.js** integrado como servicio de NestJS para recuperación de contexto y generación de respuestas.
*   **Rate Limiting Dinámico**: Guard personalizado (`DynamicThrottlerGuard`) que extiende `ThrottlerGuard` de `@nestjs/throttler`. En cada request lee los límites desde `TenantConfigCacheService` (ver sección *Gestión de Parámetros Dinámicos*). Los valores globales de fallback se definen en `.env` (`THROTTLE_USER_LIMIT`, `THROTTLE_TENANT_LIMIT`, `THROTTLE_TTL_MS`).
*   **Infraestructura**: Preparado para **AWS** en producción, completamente funcional en local con contenedores.

> ⚠️ **Advertencia Arquitectónica sobre Embeddings**: Si bien el LLM generativo es dinámicamente intercambiable por tenant, el modelo de **embeddings debe ser único y estandarizado** para todos los tenants en el MVP. Modelos distintos generan vectores de dimensiones incompatibles (OpenAI=1536 vs MiniLM=384), lo cual rompería la indexación en `pgvector`. El LLM de chat sí puede variar libremente.

---

## Modelo de Autenticación (MVP)

Dado que cada instancia de RM3 tiene su **propio secreto JWT**, el servicio centralizado no puede validar directamente esos tokens. Para el MVP se utiliza un modelo de **API Key + JWT desacoplado**:

```mermaid
sequenceDiagram
    participant RM3 as 🏢 RM3 (Mandante X)
    participant Widget as 💬 Widget
    participant Guard as 🔑 API Key Guard
    participant API as 🔧 Servicio IA
    participant DB as 🗄️ PostgreSQL

    RM3->>Widget: Inyecta widget con api_key + jwt_token
    Widget->>Guard: POST /chat (Header: X-API-Key, Authorization: Bearer JWT)
    Guard->>DB: Busca tenant por api_key en tenant_config
    DB-->>Guard: tenant_id encontrado
    Guard->>Guard: Decodifica JWT (sin validar firma) para extraer user_id
    Guard->>API: Request con tenant_id + user_id
```

*   **API Key**: Identifica al mandante-proyecto. Se almacena hasheada en `TENANT_CONFIG`. No requiere conocer el secreto JWT de RM3.
*   **JWT de RM3**: Se decodifica (sin validar firma) solo para extraer el `user_id` del usuario actual. La confianza recae en que la API Key ya validó el tenant.
*   **Producción (futuro)**: Migrar a claves asimétricas (RSA/ECDSA) donde RM3 comparte su clave pública con el servicio centralizado.

> ⚠️ **Nota de seguridad MVP**: Decodificar el JWT sin validar firma es aceptable para el MVP porque el canal ya está autenticado por la API Key. Para producción, se debe implementar validación completa.

---

## Ingestión de Documentos

Los documentos de especificación de requerimientos documentales son cargados por un **administrador único de la plataforma** a través del panel administrativo, asociados a un mandante-proyecto específico.

### Formatos Soportados
| Formato | Librería de Extracción | Notas |
|---|---|---|
| **PDF** | `pdf-parse` (Node.js) | Extrae texto plano. Para PDFs escaneados se necesitaría OCR (fuera del MVP). |
| **DOCX** | `mammoth` (Node.js) | Convierte a texto plano preservando estructura de párrafos. |
| **XLSX** | `xlsx` / `exceljs` (Node.js) | Convierte cada fila a texto estructurado (key: value). |

### Estrategia de Chunking (Fragmentación)

Se utiliza **Recursive Character Text Splitting** con overlap, la estrategia más robusta para documentos normativos/regulatorios:

| Parámetro | Valor MVP | Razón |
|---|---|---|
| `chunk_size` | **800 tokens** (~3.200 caracteres) | Balance entre contexto suficiente y precisión en la búsqueda vectorial. |
| `chunk_overlap` | **200 tokens** (~800 caracteres) | Evita cortar oraciones o ideas a la mitad entre chunks consecutivos. |
| `separators` | `["\n\n", "\n", ". ", " "]` | Prioriza cortar por párrafos, luego líneas, luego oraciones. |

> 💡 **Caso especial XLSX**: Las hojas de cálculo no se fragmentan con text splitting. Cada **fila** se convierte en un chunk independiente con formato `"Columna1: valor1, Columna2: valor2, ..."`, preservando la integridad de cada registro.

### Flujo de Ingestión

```mermaid
sequenceDiagram
    actor Admin as 👤 Administrador
    participant Panel as 📁 Panel Admin
    participant API as 🔧 NestJS API
    participant Parser as 📄 Document Parser
    participant Chunker as ✂️ Chunker
    participant Embedder as 🧠 Embedding Model
    participant DB as 🗄️ PostgreSQL + pgvector

    Admin->>Panel: Sube archivo (PDF/DOCX/XLSX)
    Panel->>API: POST /documents/ingest {file, tenant_id}
    API->>API: Genera SHA-256 (Hash) del archivo físico
    API->>DB: Revisa si existe documento con ese hash para este tenant
    alt MATCH == TRUE
       API-->>Panel: Error 409 Conflict (Documento idéntico ya existe)
    else MATCH == FALSE
       API->>DB: INSERT document (status: processing, file_hash: hash)
       API->>Parser: Extrae texto según formato
       Parser-->>API: Texto plano extraído
       API->>Chunker: Fragmenta con RecursiveTextSplitter
       Chunker-->>API: Array de chunks con metadata

    loop Por cada chunk
        API->>Embedder: Genera vector embedding
        Embedder-->>API: vector(1536)
        API->>DB: INSERT document_chunk (texto, embedding, metadata)
    end

    API->>DB: UPDATE document (status: ready)
    API-->>Panel: Ingestión completada
    Panel-->>Admin: Documento listo para consultas
    end
```

### Limpieza de Archivos (Políticas de Auditoría Transitoria)
Para soportar eventualidades y re-intentos de ingesta sin obligar al usuario a subir los PDFs pesados de nuevo, el `MulterModule` se pre-configuró con Persistencia Local (carpeta `/uploads/`).
Para impedir cuellos de botella Out Of Memory (OOM), el Gateway del servidor bloqueará por fuerza mayor de RAM a aquellos archivos que excedan  `MAX_UPLOAD_MB=10` (variables de entorno).

Adicionalmente, se ejecuta un proceso asíncrono (CRON Nocturno) con `@nestjs/schedule` para liberar memoria de almacenamiento, borrando del Sistema Operativo todos los archivos físicos que contengan antigüedades superiores a las **48 horas inyectadas** sin alterar la metadata en PostgreSQL.

## Flujo de Procesamiento RAG

```mermaid
sequenceDiagram
    actor Usuario
    participant Widget as 💬 Widget Angular
    participant Guard as 🛡️ JWT Guard
    participant API as 🔧 NestJS API
    participant Factory as 🏭 LLM Factory
    participant DB as 🗄️ PostgreSQL + pgvector
    participant LLM as 🤖 LLM (OpenAI/Gemini/Ollama)
    participant Tracker as 📊 Token Tracker

    Usuario->>Widget: Escribe pregunta
    Widget->>Guard: POST /chat {pregunta, JWT}
    Guard->>Guard: Valida JWT → extrae tenant_id + user_id
    Guard->>API: Request autenticado con tenant_id

    API->>Factory: Solicita modelo LLM para tenant_id
    Factory->>DB: SELECT llm_provider FROM tenant_config WHERE tenant_id = ?
    DB-->>Factory: {provider: "openai", model: "gpt-4o-mini"}
    Factory-->>API: Instancia LLM configurada

    API->>API: Genera embedding de la pregunta (modelo fijo)
    API->>DB: Búsqueda vectorial (similitud coseno) WHERE tenant_id = ? LIMIT k
    DB-->>API: Top-K fragmentos relevantes

    API->>API: Construye prompt con contexto + historial
    API->>LLM: Envía prompt enriquecido
    LLM-->>API: Respuesta + usage metadata (tokens_in, tokens_out)

    rect rgb(255, 243, 205)
        Note over API,Tracker: Trazabilidad de Tokens (solo métricas crudas)
        API->>Tracker: Registra consumo (tenant_id, provider, model, tokens_in, tokens_out)
        Tracker->>DB: INSERT INTO token_usage (sin costo, solo tokens)
    end

    API->>DB: Guarda mensaje en historial (chat_sessions)
    API-->>Widget: Respuesta + citas de documentos
    Widget-->>Usuario: Muestra respuesta con fuentes
```

---

## Modelo de Datos

```mermaid
erDiagram
    TENANT {
        uuid id PK
        string mandante_code
        string proyecto_code
        string nombre
        boolean activo
        timestamp created_at
    }

    TENANT_CONFIG {
        uuid id PK
        uuid tenant_id FK
        string api_key_hash "hash de la API Key del tenant"
        string llm_provider "openai | gemini | ollama"
        string llm_model "gpt-4o-mini | gemini-pro | llama3"
        string llm_api_key "encriptada"
        string embedding_model "fijo global o configurable a futuro"
        int max_context_tokens
        float temperature
        int rate_limit_user "req/min por usuario"
        int rate_limit_tenant "req/min por tenant"
        timestamp updated_at
    }

    DOCUMENT {
        uuid id PK
        uuid tenant_id FK
        string titulo
        string tipo_documento
        string formato "pdf | docx | xlsx"
        string file_path "ruta al archivo original"
        int total_chunks "cantidad de fragmentos generados"
        string status "pending | processing | ready | error"
        string error_message "mensaje de error si falla"
        timestamp created_at
    }

    DOCUMENT_CHUNK {
        uuid id PK
        uuid document_id FK
        uuid tenant_id FK
        string contenido_texto
        vector embedding "vector(1536)"
        int chunk_index
        jsonb metadata
    }

    CHAT_SESSION {
        uuid id PK
        uuid tenant_id FK
        uuid user_id
        timestamp started_at
        timestamp last_activity
    }

    CHAT_MESSAGE {
        uuid id PK
        uuid session_id FK
        string role "user | assistant"
        text content
        jsonb sources "documentos citados"
        timestamp created_at
    }

    TOKEN_USAGE {
        uuid id PK
        uuid tenant_id FK
        uuid session_id FK
        uuid message_id FK
        string llm_provider "openai | gemini | ollama"
        string llm_model "gpt-4o-mini | gemini-pro | etc"
        int tokens_input "tokens del prompt"
        int tokens_output "tokens de la respuesta"
        int tokens_total "input + output"
        string operation_type "chat | embedding"
        timestamp created_at
    }

    BILLING_PERIOD {
        uuid id PK
        string provider "openai | gemini | ollama-infra"
        date period_start
        date period_end
        decimal invoice_amount "factura real del proveedor"
        string currency "USD | CLP | UF"
        string status "open | closed | billed"
        timestamp created_at
    }

    TENANT_BILLING {
        uuid id PK
        uuid billing_period_id FK
        uuid tenant_id FK
        int total_tokens "tokens consumidos en el periodo"
        decimal usage_percentage "porcentaje de uso vs total"
        decimal allocated_cost "factura_real x porcentaje"
        timestamp calculated_at
    }

    TENANT ||--o{ TENANT_CONFIG : "tiene config IA"
    TENANT ||--o{ DOCUMENT : "posee documentos"
    DOCUMENT ||--o{ DOCUMENT_CHUNK : "se fragmenta en"
    TENANT ||--o{ CHAT_SESSION : "tiene sesiones"
    CHAT_SESSION ||--o{ CHAT_MESSAGE : "contiene mensajes"
    TENANT ||--o{ TOKEN_USAGE : "acumula consumo"
    CHAT_MESSAGE ||--o| TOKEN_USAGE : "genera registro"
    BILLING_PERIOD ||--o{ TENANT_BILLING : "se distribuye en"
    TENANT ||--o{ TENANT_BILLING : "recibe cargo"
```

---

## Patrón Factory: Selección Dinámica de LLM

```mermaid
flowchart LR
    REQ["📥 Request del Tenant"] --> GUARD["🛡️ JWT Guard<br/>extrae tenant_id"]
    GUARD --> SVC["🔧 LLM Service"]
    SVC --> DB["🗄️ tenant_config<br/>consulta proveedor"]
    DB --> FACTORY{"🏭 LLM Factory"}

    FACTORY -->|provider = openai| OAI["OpenAI Adapter<br/>ChatOpenAI()"]
    FACTORY -->|provider = gemini| GEM["Gemini Adapter<br/>ChatGoogleGenerativeAI()"]
    FACTORY -->|provider = ollama| OLL["Ollama Adapter<br/>ChatOllama()"]

    OAI --> CHAIN["🧠 RAG Chain<br/>(LangChain.js)"]
    GEM --> CHAIN
    OLL --> CHAIN

    CHAIN --> RESP["📤 Respuesta al Widget"]
```

---

## Trazabilidad de Consumo y Prorrateo de Facturación

El sistema utiliza un modelo de **Prorrateo Proporcional por Uso Real** (*Proportional Cost Allocation*), el cual está fuertemente diseñado para soportar que un mismo tenant pueda utilizar múltiples proveedores de IA (ej. OpenAI y Gemini) en un mismo periodo. En lugar de estimar costos por token, el sistema opera así:

1.  **Registra tokens crudos** por cada interacción, adjuntando siempre qué `llm_provider` y `llm_model` procesó dicha petición (sin calcular costos al vuelo).
2.  **Al cierre del periodo**, el administrador ingresa la **factura real** de cada proveedor de forma independiente (ej: Ingresa factura de OpenAI, luego factura de Google).
3.  **Calcula automáticamente** el porcentaje de uso de cada tenant **particionado por proveedor**.

### Comportamiento Multi-Proveedor
Si a mitad de mes el administrador cambia el motor LLM de un `tenant` (ej. pasa de OpenAI a Gemini), el sistema registrará el consumo para cada proveedor de manera aislada. Al final del periodo, ese `tenant` recibirá **cobros fraccionados e independientes**: uno calculado sobre la factura de OpenAI, y otro sobre la porción de uso de la factura de Gemini.

### Ventajas del modelo
*   ✅ **Tolerancia a Cambios en Caliente**: Cobro matemático exacto incluso si la configuración del proveedor en el tenant cambia múltiples veces durante el mes.
*   ✅ **Sin tabla de precios que mantener**: no importa si el proveedor cambia o ajusta sus tarifas por token.
*   ✅ **Precisión total**: se reparte la factura agregada real.
*   ✅ **Agnóstico a moneda**: la factura base se carga en USD, CLP, UF.

> ⚠️ **Limitación conocida**: No hay visibilidad del gasto monetario en tiempo real para el tenant. Solo conocerá su consumo de "tokens". El valor monetario nace al cierre tras ingresar la factura de nube.

### Ejemplo Numérico (Caso Tenant Híbrido)

Supongamos que el **Proyecto 1** empezó el mes con OpenAI y luego se le cambió a Gemini:

| Tenant | Proveedor | Tokens consumidos | % del volúmen total (por proveedor) | Factura real ingresada | Costo asignado |
|---|---|---|---|---|---|
| Mandante A - Proyecto 1 | **OpenAI**| 150.000 | 30% | $50.00 USD (OpenAI)| **$15.00 USD** |
| Mandante A - Proyecto 2 | **OpenAI**| 350.000 | 70% | — | $35.00 USD |
| Mandante A - Proyecto 1 | **Gemini**| 50.000  | 100% | $10.00 USD (Google)| **$10.00 USD** |
| **TOTAL FACTURADO** | | | | **$60.00 USD** | **$60.00 USD** |

### Flujo de Prorrateo Proporcional

```mermaid
flowchart TB
    subgraph "Fase 1: Registro en Tiempo Real (automático)"
        REQ["💬 Interacción del usuario"] --> RAG["🧠 Motor RAG + LLM"]
        RAG --> META["📋 Usage Metadata<br/>(tokens_in, tokens_out, provider, model)"]
        META --> DB["🗄️ INSERT token_usage<br/>(tenant_id, tokens crudos, sin costo)"]
    end

    subgraph "Fase 2: Cierre de Periodo (manual/programado)"
        INV["🧾 Ingreso Factura Real<br/>del Proveedor (monto + moneda)"] --> BP["📅 Crear BILLING_PERIOD<br/>(provider, monto, fechas)"]
        BP --> AGG["📊 Calcular % uso por Tenant<br/>SUM tokens por tenant / total tokens<br/>WHERE provider = X AND periodo = Y"]
        AGG --> ALLOC["🧮 Asignar Costo Proporcional<br/>allocated_cost = factura × %uso"]
        ALLOC --> TB["💰 INSERT TENANT_BILLING<br/>(tenant_id, %, costo asignado)"]
    end

    subgraph "Fase 3: Reportes"
        TB --> REPORT["📈 API de Reportes<br/>GET /billing/report"]
        TB --> EXPORT["📄 Exportar a Excel/PDF<br/>para facturación interna"]
    end
```

### Implementación Técnica

*   **Interceptor de NestJS (Fase 1)**: Un interceptor global captura el metadata de uso (`usage.prompt_tokens`, `usage.completion_tokens`) que retorna cada proveedor LLM. Se registra de forma **asíncrona y no bloqueante** en `token_usage` (solo tokens crudos, sin cálculo de costos).
*   **Servicio de Facturación (Fase 2)**: El `BillingService` se invoca al cierre de periodo (manualmente o vía cron job). Recibe el monto de la factura real, calcula los porcentajes de uso por tenant y genera los registros de `TENANT_BILLING`.
*   **API de Reportes (Fase 3)**:
    *   `GET /usage/report?tenant_id=X&from=Y&to=Z` — Consumo de tokens crudos (disponible siempre).
    *   `GET /billing/report?period_id=X` — Costo asignado por tenant (disponible solo después del cierre).
    *   `POST /billing/period` — Registrar una factura real de proveedor y disparar el prorrateo.

---

## Gestión del Estado

### Frontend (Widget)
*   Estado interno (historial de mensajes, loading, abierto/cerrado) administrado mediante **Signals** o **RxJS BehaviorSubjects** nativos de Angular.
*   El Web Component recibe **API Key** + **JWT** como input properties de la app host, enviándolos en cada llamada HTTP al backend.
*   Ante errores, muestra: *"No puedo responder en estos momentos. Si el problema persiste, contáctese con el administrador."*

### Backend
*   **API Key Guard de NestJS** identifica al tenant mediante la API Key. El JWT se decodifica para extraer el `user_id`.
*   **Multi-tenant**: El `tenant_id` (derivado de la API Key) se usa como filtro estricto en Prisma (Data Isolation).
*   **Rate Limiting Dinámico**: `DynamicThrottlerGuard` consulta `TenantConfigCacheService` para obtener los límites del tenant activo. Si el tenant no tiene configuración propia, se usan los valores del `.env`. Los límites se pueden actualizar sin reiniciar el servicio (invalidan la caché).
*   **Logging Estructurado**: Todos los errores se registran con nivel, timestamp, tenant_id y stack trace.
*   El historial de conversación se registra en las tablas `chat_session` y `chat_message` de PostgreSQL a través de Prisma.
*   El system prompt del RAG fuerza respuestas en **español**.

---

## Gestión de Parámetros Dinámicos por Tenant

Todos los parámetros operacionales del servicio siguen una **jerarquía de configuración en dos niveles** que permite administrarlos en tiempo de ejecución sin reiniciar el servicio:

```mermaid
flowchart LR
    ENV[".env\n(Defaults Globales)"] -->|fallback| CACHE["TenantConfigCacheService\n(TTL configurable)"]
    DB["TENANT_CONFIG\n(PostgreSQL)"] -->|override por tenant| CACHE
    CACHE -->|parámetros resueltos| GUARD["DynamicThrottlerGuard"]
    CACHE -->|parámetros resueltos| FACTORY["LLM Factory"]
    CACHE -->|parámetros resueltos| RAG["RAG Service"]
```

### Jerarquía de Configuración

| Nivel | Fuente | Alcance | Actualización |
|---|---|---|---|
| **1 (base)** | `.env` | Global (todos los tenants) | Requiere reinicio del servicio |
| **2 (override)** | `TENANT_CONFIG` en PostgreSQL | Por tenant (mandante-proyecto) | En caliente, sin reinicio |

### TenantConfigCacheService

Servicio singleton que actúa como capa de caché en memoria para la configuración por tenant:

*   **Caché en memoria** (`Map<tenant_id, TenantConfig>`) con TTL configurable (`CACHE_TTL_MS` en `.env`, default: 5 minutos).
*   **Resolución lazy**: En el primer request de un tenant, carga su config desde la BD y la almacena en caché.
*   **Invalidación explícita**: El endpoint `PUT /tenants/:id/config` invalida la entrada de caché del tenant afectado inmediatamente, garantizando que el siguiente request use los nuevos valores.
*   **Concurrencia segura**: Las lecturas son no bloqueantes. Las escrituras usan locking optimista vía Prisma.

### Parámetros administrados dinámicamente

| Parámetro | Campo en `TENANT_CONFIG` | Variable `.env` (fallback) | Descripción |
|---|---|---|---|
| Límite req/min por usuario | `rate_limit_user` | `THROTTLE_USER_LIMIT=30` | Peticiones máximas por usuario por minuto |
| Límite req/min por tenant | `rate_limit_tenant` | `THROTTLE_TENANT_LIMIT=200` | Peticiones máximas totales del tenant por minuto |
| Proveedor LLM | `llm_provider` | `DEFAULT_LLM_PROVIDER=openai` | Motor generativo (openai, gemini, ollama) |
| Modelo LLM | `llm_model` | `DEFAULT_LLM_MODEL=gpt-4o-mini` | Versión del modelo a usar |
| Temperatura LLM | `temperature` | `DEFAULT_LLM_TEMPERATURE=0.2` | Creatividad de las respuestas |
| Tokens de contexto | `max_context_tokens` | `DEFAULT_MAX_CONTEXT_TOKENS=4000` | Tamaño máximo del contexto RAG |

### DynamicThrottlerGuard (Rate Limiting)

Guard personalizado que extiende `ThrottlerGuard` de `@nestjs/throttler`:

```
DynamicThrottlerGuard.canActivate(context)
  └─ extrae tenant_id del request (previamente inyectado por ApiKeyGuard)
  └─ llama TenantConfigCacheService.getConfig(tenant_id)
  └─ obtiene { rate_limit_user, rate_limit_tenant } (con fallback a .env)
  └─ genera claves de caché separadas: "user:{user_id}" y "tenant:{tenant_id}"
  └─ evalúa ambos límites; rechaza con HTTP 429 si cualquiera se supera
```

> 💡 **Patrón extensible**: Este mismo patrón (`CacheService` + guard/service que resuelve config en tiempo de ejecución) aplica para cualquier parámetro futuro que requiera configuración por tenant, como quotas de documentos, idioma de respuesta, o modelos de embedding.

---

## Alcance del MVP

### ✅ Incluido en el MVP
| Feature | Detalle |
|---|---|
| Chat RAG funcional | Widget embebible con preguntas/respuestas basadas en documentos |
| 1 proveedor LLM configurado | OpenAI (GPT-4o-mini) como default. Factory preparado para más |
| Ingestión de documentos | Panel admin básico + endpoint API para PDF, DOCX, XLSX |
| Token tracking | Registro de tokens crudos por interacción y tenant |
| Billing básico | Prorrateo proporcional con ingreso manual de factura |
| Rate limiting | Protección básica contra abuso |
| Docker local | Toda la solución levanta con `docker-compose up` |
| Datos de prueba | Documentos de ejemplo anonimizados para demostración |

### ❌ Fuera del MVP
| Feature | Razón |
|---|---|
| Dashboard visual de reportes | Se prioriza la API. Dashboard es iteración posterior |
| Múltiples proveedores LLM simultáneos | El Factory está listo, pero solo se configura 1 para el MVP |
| Validación JWT con clave asimétrica | Requiere coordinación con equipos de RM3 |
| OCR para PDFs escaneados | Complejidad adicional significativa |
| Exportación Excel/PDF de reportes | Iteración posterior al MVP |

---

## Estructura de Carpetas del Proyecto (MVP)

```
app_build/
├── backend/                          # NestJS
│   ├── src/
│   │   ├── auth/                     # Módulo API Key Guard
│   │   ├── chatbot/                  # Módulo principal del chatbot
│   │   │   ├── chatbot.controller.ts
│   │   │   ├── chatbot.service.ts
│   │   │   ├── llm-factory.service.ts  # Factory dinámico
│   │   │   ├── token-tracking.service.ts # Trazabilidad de tokens
│   │   │   └── rag.service.ts          # Cadena RAG
│   │   ├── documents/                # Módulo de ingestión de documentos
│   │   │   ├── documents.controller.ts # Upload + ingest API
│   │   │   ├── documents.service.ts   # Lógica de ingestión
│   │   │   ├── parsers/               # Extractores por formato
│   │   │   │   ├── pdf.parser.ts
│   │   │   │   ├── docx.parser.ts
│   │   │   │   └── xlsx.parser.ts
│   │   │   └── chunker.service.ts     # Estrategia de fragmentación
│   │   ├── tenant/                   # Módulo de configuración por tenant
│   │   ├── billing/                  # Módulo de facturación y reportes
│   │   │   ├── billing.controller.ts  # API de reportes y cierre de periodo
│   │   │   └── billing.service.ts     # Prorrateo proporcional y cálculos
│   │   ├── common/                   # Utilidades compartidas
│   │   │   ├── filters/               # Exception filters (error handling)
│   │   │   ├── interceptors/          # Logging interceptor
│   │   │   └── guards/                # Rate limit guard
│   │   ├── prisma/                   # Módulo Prisma
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma             # Modelo de datos
│   │   └── seed.ts                   # Datos de prueba
│   ├── uploads/                      # Archivos subidos (montaje Docker)
│   ├── .env.example
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
├── frontend/                         # Angular Widget + Admin Panel
│   ├── src/
│   │   ├── app/
│   │   │   ├── chatbot/              # Componente widget del chat
│   │   │   ├── admin/                # Panel de carga de documentos
│   │   │   └── services/             # Servicios HTTP
│   │   └── main.ts                   # Bootstrap como Web Component
│   ├── package.json
│   ├── Dockerfile
│   └── angular.json
├── docs/                             # Documentos de prueba anonimizados
├── docker-compose.yml                # PostgreSQL + Backend + Frontend
└── README.md
```
