# Guía de Integración: RM3 RAG Chatbot Widget

Este documento detalla los pasos para embeber el Widget del Chatbot RAG en cualquier página web, aplicación estática o portal corporativo. 

El Chatbot RM3 ha sido empaquetado utilizando **Angular Elements**, lo que significa que se expone como un estándar nativo del navegador (*Custom Element* o *Web Component*). Gracias a esto, **no requiere** que el front-end destino esté hecho en Angular, React o Vue; funciona directamente sobre HTML puro y Vanilla JavaScript.

---

## 1. Archivos Requeridos (Bundles)

Para incrustar el chatbot, debes referenciar los artefactos de compilación generados por el proceso de build del frontend. Solo se requieren dos archivos:

1. **`styles.css`**: Contiene la capa de estilos base y Tailwind encapsulada para el widget y sus micro-animaciones (Glassmorphism, transiciones).
2. **`main.js`**: El empaquetado completo (Polyfills + Lógica + Web Component).

### Inserción en el `<head>` y/o al final de `<body>`

Añade las siguientes referencias en el HTML de la página destino alojada en tu portal.

```html
<!-- 1. Estilos del Widget -->
<link rel="stylesheet" href="path/to/widget-dist/styles.css">

<!-- 2. Script principal del Widget -->
<!-- Recomendamos usar 'defer' para que cargue sin bloquear el render de la página principal -->
<script src="path/to/widget-dist/main.js" defer></script>
```

> [!NOTE]
> *Nota: Reemplaza `path/to/widget-dist/` por la URL absoluta de tu CDN o directorio estático donde se publicaron estos bundles.*

---

## 2. Inserción del Custom Element

Una vez que el navegador carga el archivo `main.js`, entenderá y registrará automáticamente la nueva etiqueta `<chatbot-widget>`. 

Solo necesitas colocar esta etiqueta en cualquier lugar dentro del `<body>` de tu código HTML. Dado que el widget está diseñado para posicionamiento "Fixed" (flotante inferior derecho), su posición física real en el marcado DOM es poco representativa.

```html
<chatbot-widget
  tenant="tu-tenant-uuid"
  api-key="tu-api-key"
  assistant-name="Buscador Documental RM3"
  api-url="https://tu-api.dominio.com">
</chatbot-widget>
```

---

## 3. Atributos de Configuración (Props)

El widget es dinámico y extrae el contexto de la sesión y credenciales desde los atributos de la etiqueta HTML. A continuación el detalle de los parámetros disponibles:

| Atributo | Obligatorio | Descripción | Ejemplo |
| :--- | :---: | :--- | :--- |
| **`tenant`** | Sí | Corresponde al ID de Inquilino/Proyecto para aislar los documentos y costos. | `8f890ac8-b292-428a-bc0c...` |
| **`api-key`** | Sí | Clave de acceso secreta entregada por el Panel Admin (Autorización RAG). | `test_key_rm3_2026` |
| **`api-url`** | No | URL del servidor Backend NestJS principal. Por defecto asume `http://localhost:3000`. | `https://api.rm3.com` |
| **`assistant-name`** | No | Sobreescribe el texto del Topbar del bot. Por defecto es "Asistente AI". | `RM3 Validador 2.0` |

---

## 💡 Código de Ejemplo Simple "Copy/Paste"

Si se requiere probar el concepto en un archivo plano rápido `test.html` usando tu servidor local activo (levantado en el puerto `4300`):

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Página Corporativa - Sandbox Integración</title>
    
    <!-- 1. Importación Visual -->
    <link rel="stylesheet" href="http://localhost:4300/widget-dist/styles.css">
    
    <style>
      body { font-family: sans-serif; background: #e2e8f0; padding: 2rem; }
      .content { background: white; padding: 3rem; border-radius: 8px; max-width: 800px; }
    </style>
</head>
<body>
    <div class="content">
        <h1>Intranet Corporativa RM3</h1>
        <p>Prueba de inyección de Web Component RAG en un sistema Legacy.</p>
    </div>
    
    <!-- 2. Importación del Tag Personalizado con credenciales de prueba locales -->
    <chatbot-widget 
        tenant="8f890ac8-b292-428a-bc0c-2d437bdb4091"
        api-key="test_key_rm3_2026"
        api-url="http://localhost:3000"
        assistant-name="Asistente de Normativas">
    </chatbot-widget>

    <!-- 3. Importación Funcional -->
    <script src="http://localhost:4300/widget-dist/main.js" defer></script>
</body>
</html>
```

---

## 🛠️ Modificaciones Posteriores (Changelog y Trazabilidad)

Si necesitas forzar a la IA a reiniciar la sesión o recargar al cambiar dinámicamente un Tenant:
- Desde JavaScript, puedes destruir la etiqueta del DOM completo y volver a apendizar (*append*) creando el nodo `document.createElement('chatbot-widget')`. 
- El `findOrCreateSession` en el Backend de NestJS se encargará del resto utilizando la persistencia PostgreSQL.
