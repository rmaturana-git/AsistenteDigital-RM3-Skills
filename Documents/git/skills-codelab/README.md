# Asistente Digital Multi-Tenant RM3 (RAG System)

Bienvenido al ecosistema del Asistente Digital para la plataforma RM3, especializado en el procesamiento, ingestión y recuperación inteligente (Retrieval-Augmented Generation) de documentos asociados a la acreditación corporativa y previsional de personal contratista.

## Arquitectura y Módulos

El proyecto está separado principalmente en la siguiente estructura:

* `/app_build/admin-panel/`: **Panel Administrativo (Frontend Vanilla)**
  Construido en HTML/JS interactivo para gestionar variables críticas como Rate-Limits, Modelos de LLM (Gemini, OpenAI, Ollama) y Tokens configurados bajo un esquema estricto Multi-Tenant (por mandante-proyecto). Mocks habilitados en `api.js` facilitando diseño previo.

* `/app_build/backend/`: **Inteligencia y APIs (NestJS + Prisma + LangChain)**
  Core del chatbot que absorbe y troza la información normativa (PDF/DOCX/XLSX), publicándola vectorial y programáticamente en el motor `pgvector`, y exponiendo una Fábrica dinámica de LLMs protegida bajo validadores de Capa (Guards/API Keys + JWT sin estados acoplados).
  
* `/production_artifacts/`: Especificaciones Técnicas, diagramas E-R y flujos de arquitectura (Changelog de decisiones) definidos con el Asistente AI avanzado.

## Puesta en Marcha Inicial
 
1. Requisito: Tener encendido el motor local de `Docker / Docker Desktop`.
2. Lanzar de la base de datos de indexación usando `docker-compose up -d`
3. Instalar librerías del backend (carpeta app_build/backend): `npm install`
4. Cargar y compilar el esquema vectorial de PostgreSQL: `npx prisma db push --accept-data-loss`
5. Servir el API Base de IA: `npm run start`

## Gestión y Visualización de Base de Datos

El núcleo del ecosistema RAG es una base autogestionada de PostgreSQL optimizada para Inteligencia Artificial mediante **pgvector**. Para inspeccionar las tablas, realizar manipulaciones CRUD o auditar los `document_chunks`, existen dos vías estandarizadas:

**A. Prisma Studio (Recomendado)**
Entorno gráfico que arranca en el navegador (`localhost:5555`) sin configurar clientes remotos.
```bash
cd app_build/backend
npx prisma studio
```

**B. Conexión SQL Directa (pgAdmin, DBeaver, DataGrip, VSCode)**
```text
Host: localhost
Puerto: 5432
Base de Datos: rm3_rag
Usuario: admin
Contraseña: password123
```

---
*Este repositorio es mantenido y modificado iterativamente gestionando ciclos estructurados de análisis (Fase 1), diseño (Fase 2) y programación AI asistida (Fase 3).*
