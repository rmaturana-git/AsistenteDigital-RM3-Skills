/* ================================================================
   widget-demo.view.js — Vista de prueba del Web Component embebido
   Carga dinámicamente los bundles del chatbot-widget Angular Elements
   y los inyecta en el admin panel para validación visual E2E.
   ================================================================ */

const WidgetDemoView = (() => {

  // Tenant y configuración de prueba (mismos valores que el E2E test)
  const DEMO_CONFIG = {
    tenantId: '8f890ac8-b292-428a-bc0c-2d437bdb4091',
    apiKey: 'demo-admin-key',
    apiBaseUrl: 'http://localhost:3000',
  };

  let bundleLoaded = false;

  /**
   * Carga los bundles del widget una única vez para evitar re-registrar el Custom Element.
   * Angular Elements lanza error si se intenta definir dos veces el mismo tag.
   */
  function loadWidgetBundles() {
    return new Promise((resolve) => {
      if (bundleLoaded) { resolve(); return; }

      // Inyectar CSS del widget si no existe
      if (!document.getElementById('chatbot-widget-styles')) {
        const link = document.createElement('link');
        link.id   = 'chatbot-widget-styles';
        link.rel  = 'stylesheet';
        link.href = `../widget-dist/styles.css?t=${Date.now()}`;
        document.head.appendChild(link);
      }

      // Inyectar el JS del widget si no existe
      if (!document.getElementById('chatbot-widget-bundle')) {
        const script  = document.createElement('script');
        script.id     = 'chatbot-widget-bundle';
        script.src    = `../widget-dist/main.js?t=${Date.now()}`;
        script.onload = () => { bundleLoaded = true; resolve(); };
        script.onerror = () => {
          console.error('[WidgetDemo] Error cargando main.js del widget.');
          resolve(); // Continuar aunque falle para mostrar el error al usuario
        };
        document.body.appendChild(script);
      } else {
        bundleLoaded = true;
        resolve();
      }
    });
  }

  async function render() {
    const container = document.getElementById('view-container');

    // Actualizar breadcrumb
    const bc = document.getElementById('breadcrumb');
    if (bc) bc.textContent = 'Widget Demo';

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🧪 Widget Demo — Prueba de Integración E2E</h1>
        <p class="page-subtitle">
          El Web Component <code>&lt;chatbot-widget&gt;</code> compilado desde Angular Elements está embebido debajo.
          Usa esta vista para validar el ciclo completo de RAG en una página cliente real.
        </p>
      </div>

      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-info">
            <div class="stat-label">Tenant ID</div>
            <div class="stat-value" style="font-size:0.8rem; font-family: monospace;">${DEMO_CONFIG.tenantId}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🌐</div>
          <div class="stat-info">
            <div class="stat-label">Backend</div>
            <div class="stat-value">${DEMO_CONFIG.apiBaseUrl}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" id="widget-status-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-label">Estado del Bundle</div>
            <div class="stat-value" id="widget-status-text">Cargando...</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding: 2rem; min-height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 1.5rem;">

        <div style="width: 100%; max-width: 420px;">
          <div style="background: linear-gradient(135deg, rgba(230,83,0,0.1), rgba(230,83,0,0.05)); border: 1px solid rgba(230,83,0,0.2); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--text-secondary);">
            ℹ️ <strong>Nota:</strong> El widget requiere un JWT válido para autenticar contra el backend.
            En esta demo, el token se inyecta como atributo <code>jwt-token</code>. El widget aceptará o
            rechazará la consulta según las reglas del <code>ApiKeyGuard</code>.
          </div>

          <!-- Web Component inyectado -->
          <div id="widget-mount-point">
            <!-- chatbot-widget se renderiza aquí tras cargar el bundle -->
          </div>
        </div>

        <div style="width: 100%; max-width: 420px;">
          <div class="card" style="padding: 1rem; background: rgba(0,0,0,0.2);">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">Logs de Integración</h3>
            <div id="widget-demo-logs" style="font-family: monospace; font-size: 0.78rem; color: #a3e635; background: #0a0a0a; border-radius: 8px; padding: 0.75rem; min-height: 80px; max-height: 150px; overflow-y: auto; white-space: pre-wrap;"></div>
          </div>
        </div>

      </div>
    `;

    const logEl = document.getElementById('widget-demo-logs');
    const statusIcon = document.getElementById('widget-status-icon');
    const statusText = document.getElementById('widget-status-text');

    function log(msg) {
      const ts = new Date().toLocaleTimeString('es-CL');
      logEl.textContent += `[${ts}] ${msg}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    }

    log('Iniciando carga de bundle Angular Elements...');

    await loadWidgetBundles();

    // Verificar si el Custom Element fue registrado correctamente
    if (customElements.get('chatbot-widget')) {
      statusIcon.textContent = '✅';
      statusText.textContent = 'Bundle Cargado';
      log('Custom Element <chatbot-widget> detectado: ✅');
      log(`API Base: ${DEMO_CONFIG.apiBaseUrl}`);
      log(`Tenant: ${DEMO_CONFIG.tenantId}`);
      log('Montando widget...');

      const mountPoint = document.getElementById('widget-mount-point');
      mountPoint.innerHTML = `
        <chatbot-widget
          id="admin-demo-widget"
          api-key="${DEMO_CONFIG.apiKey}"
          tenant="${DEMO_CONFIG.tenantId}"
          assistant-name="RM3 Validator"
        ></chatbot-widget>
      `;
      log('Widget montado. Interactúa con él para probar el RAG.');

    } else {
      statusIcon.textContent = '❌';
      statusText.textContent = 'Error de Bundle';
      log('ERROR: Custom Element <chatbot-widget> NO encontrado.');
      log('Verifica que main.js compiló correctamente con Angular Elements.');

      document.getElementById('widget-mount-point').innerHTML = `
        <div style="text-align:center; padding: 2rem; color: #f87171;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <div style="font-weight: 600;">Bundle no disponible</div>
          <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">
            Ejecuta <code>npm run build</code> en <code>app_build/frontend</code> y recarga.
          </div>
        </div>
      `;
    }
  }

  return { render };
})();
