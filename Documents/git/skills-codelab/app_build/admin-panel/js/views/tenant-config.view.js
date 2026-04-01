/* tenant-config.view.js — Dynamic per-tenant configuration form */

async function renderTenantConfig({ id: tenantId }) {
  if (!tenantId) { Router.navigate('/tenants'); return; }

  const el = document.getElementById('view-container');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const [tenantRes, configRes, keyRes] = await Promise.all([
      API.getTenant(tenantId),
      API.getTenantConfig(tenantId),
      API.getTenantApiKey(tenantId),
    ]);

    const tenant = tenantRes.data;
    const cfg    = configRes.data;
    const apiKey = keyRes.data.api_key;

    setBreadcrumb(`Tenants → ${tenant.mandante_code} · ${tenant.proyecto_code}`);

    const providerOptions = API.getLLMProviders().map(p =>
      `<option value="${p}" ${cfg.llm_provider===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`
    ).join('');

    const modelOptions = (provider) => API.getLLMModels(provider).map(m =>
      `<option value="${m}" ${cfg.llm_model===m?'selected':''}>${m}</option>`
    ).join('');

    el.innerHTML = `
      <div class="page-header">
        <div>
          <a href="#/tenants" class="btn btn-ghost btn-sm" style="margin-bottom:8px">← Volver</a>
          <h1 class="page-title">${tenant.nombre}</h1>
          <p class="page-subtitle">Configuración operacional · ${tenant.mandante_code} / ${tenant.proyecto_code}</p>
        </div>
        <span class="badge ${tenant.activo ? 'badge-success' : 'badge-muted'}" style="align-self:flex-start;padding:6px 14px;font-size:12px">
          ${tenant.activo ? '● Activo' : '● Inactivo'}
        </span>
      </div>

      <div class="alert alert-info">
        ℹ Los cambios se aplican en caliente. El <strong>TenantConfigCacheService</strong> invalida la caché automáticamente al guardar. Los valores sin configurar usan los defaults del <code>.env</code> global.
      </div>

      <form id="config-form">
        <div class="grid-2">

          <!-- ── LLM Settings ─────────────────────────────── -->
          <div class="card">
            <div class="form-section-title">🤖 LLM Settings</div>

            <div class="form-group">
              <label class="form-label">Proveedor LLM <span class="required">*</span></label>
              <select id="llm-provider" class="form-control">${providerOptions}</select>
              <span class="form-hint">Selecciona el motor generativo para este tenant.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Modelo <span class="required">*</span></label>
              <select id="llm-model" class="form-control">
                ${modelOptions(cfg.llm_provider)}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Temperatura
                <span class="text-muted text-sm">(creatividad de respuestas)</span>
              </label>
              <div class="slider-wrap">
                <input type="range" class="form-slider" id="temperature"
                  min="0" max="1" step="0.05" value="${cfg.temperature}" />
                <span class="slider-val" id="temp-val">${cfg.temperature}</span>
              </div>
              <span class="form-hint">0 = determinista · 1 = muy creativo. Recomendado para RAG: 0.1–0.3</span>
            </div>

            <div class="form-group mb-0">
              <label class="form-label">Tokens de Contexto Máximo</label>
              <div class="input-unit-wrap">
                <input type="number" id="max-context" value="${cfg.max_context_tokens}" min="512" max="32000" step="512" />
                <span class="input-unit-label">tokens</span>
              </div>
              <span class="form-hint">Contexto RAG máximo a incluir en el prompt.</span>
            </div>
          </div>

          <!-- ── Rate Limiting ─────────────────────────────── -->
          <div class="card">
            <div class="form-section-title">🚫 Rate Limiting Dinámico</div>

            <div class="alert alert-warning" style="margin-bottom:16px;font-size:12px">
              ⚡ Los límites se leen desde esta tabla en tiempo de ejecución (caché TTL: 5 min). Si no se configuran, aplican los defaults del <code>.env</code>: <strong>30 req/min usuario · 200 req/min tenant</strong>.
            </div>

            <div class="form-group">
              <label class="form-label">Límite por Usuario</label>
              <div class="input-unit-wrap">
                <input type="number" id="rl-user" value="${cfg.rate_limit_user}" min="1" max="1000" />
                <span class="input-unit-label">req / min</span>
              </div>
              <span class="form-hint">Máximo de peticiones por usuario individual por minuto.</span>
            </div>

            <div class="form-group mb-0">
              <label class="form-label">Límite Total del Tenant</label>
              <div class="input-unit-wrap">
                <input type="number" id="rl-tenant" value="${cfg.rate_limit_tenant}" min="1" max="5000" />
                <span class="input-unit-label">req / min</span>
              </div>
              <span class="form-hint">Límite agregado de todos los usuarios del tenant juntos.</span>
            </div>

            <hr class="divider" />

            <div class="form-section-title">🔑 API Key</div>
            <div class="form-group mb-0">
              <label class="form-label">API Key del Tenant</label>
              <div class="apikey-wrap">
                <span class="apikey-val" id="apikey-display">
                  ${maskApiKey(apiKey)}
                </span>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-toggle-key">Mostrar</button>
                <button type="button" class="btn btn-danger btn-sm" id="btn-regen-key">Regenerar</button>
              </div>
              <span class="form-hint">El widget de RM3 usa esta clave para identificar al tenant.</span>
            </div>
          </div>

        </div>

        <!-- ── LLM API Key (proveedor externo) ──────────────── -->
        <div class="card" style="margin-top:18px">
          <div class="form-section-title">🔐 Credenciales del Proveedor LLM</div>
          <div class="form-group mb-0">
            <label class="form-label">API Key del Proveedor <span id="provider-label" class="text-muted text-sm">(${cfg.llm_provider})</span></label>
            <input type="password" id="llm-api-key" class="form-control"
              placeholder="Ingresa la API Key del proveedor seleccionado"
              value="${cfg.llm_provider === 'ollama' ? '' : '••••••••••••••••••••••••'}" />
            <span class="form-hint" id="apikey-hint">${providerKeyHint(cfg.llm_provider)}</span>
          </div>
        </div>

        <!-- ── Save bar ──────────────────────────────────────── -->
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border-subtle)">
          <a href="#/tenants" class="btn btn-secondary">Cancelar</a>
          <button type="submit" class="btn btn-primary" id="btn-save">
            Guardar Configuración
          </button>
        </div>
      </form>
    `;

    // ── Dynamic model options when provider changes ──────────────
    const provSelect  = document.getElementById('llm-provider');
    const modelSelect = document.getElementById('llm-model');
    const apiKeyInput = document.getElementById('llm-api-key');
    const keyHint     = document.getElementById('apikey-hint');
    const provLabel   = document.getElementById('provider-label');

    provSelect.addEventListener('change', () => {
      const prov = provSelect.value;
      modelSelect.innerHTML = API.getLLMModels(prov)
        .map(m => `<option value="${m}">${m}</option>`).join('');
      apiKeyInput.value = prov === 'ollama' ? '' : '';
      apiKeyInput.placeholder = prov === 'ollama'
        ? 'No requerida (modelo local)' : `API Key de ${prov}`;
      apiKeyInput.disabled = prov === 'ollama';
      keyHint.textContent  = providerKeyHint(prov);
      provLabel.textContent = `(${prov})`;
    });

    // ── Temperature slider ────────────────────────────────────────
    const tempSlider = document.getElementById('temperature');
    const tempVal    = document.getElementById('temp-val');
    tempSlider.addEventListener('input', () => { tempVal.textContent = tempSlider.value; });

    // ── API Key toggle / regenerate ──────────────────────────────
    let fullKey = apiKey;
    let showing = false;

    document.getElementById('btn-toggle-key').addEventListener('click', () => {
      showing = !showing;
      document.getElementById('apikey-display').textContent = showing ? fullKey : maskApiKey(fullKey);
      document.getElementById('btn-toggle-key').textContent = showing ? 'Ocultar' : 'Mostrar';
    });

    document.getElementById('btn-regen-key').addEventListener('click', async () => {
      if (!confirm('¿Regenerar la API Key? El widget de RM3 dejará de funcionar hasta actualizarla.')) return;
      const btn = document.getElementById('btn-regen-key');
      btn.disabled = true; btn.textContent = '…';
      try {
        const { data } = await API.regenerateApiKey(tenantId);
        fullKey = data.api_key;
        
        // Guardar en sesión local para el Admin Panel
        window.localStorage.setItem(`api_key_${tenantId}`, fullKey);

        document.getElementById('apikey-display').textContent = maskApiKey(fullKey);
        showing = false;
        document.getElementById('btn-toggle-key').textContent = 'Mostrar';

        alert(`¡API Key Regenerada!\n\nNUEVA KEY: ${fullKey}\n\nGuárdela ahora. No volverá a aparecer.`);
        showToast('API Key regenerada y guardada en sesión local.', 'success');
      } catch { showToast('Error al regenerar la API Key', 'error'); }
      finally  { btn.disabled = false; btn.textContent = 'Regenerar'; }
    });

    // ── Form submit ──────────────────────────────────────────────
    document.getElementById('config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Guardando…';

      const newCfg = {
        llm_provider:      provSelect.value,
        llm_model:         modelSelect.value,
        temperature:       parseFloat(tempSlider.value),
        max_context_tokens:parseInt(document.getElementById('max-context').value),
        rate_limit_user:   parseInt(document.getElementById('rl-user').value),
        rate_limit_tenant: parseInt(document.getElementById('rl-tenant').value),
      };

      try {
        await API.updateTenantConfig(tenantId, newCfg);
        showToast('Configuración guardada. Caché invalidada correctamente.', 'success');
      } catch { showToast('Error al guardar la configuración', 'error'); }
      finally  { btn.disabled = false; btn.textContent = 'Guardar Configuración'; }
    });

  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">Error al cargar la configuración: ${err.message || 'Error desconocido'}</div>`;
  }
}

function maskApiKey(key) {
  if (!key) return '—';
  return key.slice(0, 8) + '••••••••••••••••' + key.slice(-4);
}

function providerKeyHint(provider) {
  const hints = {
    openai: 'Obtén tu clave en platform.openai.com/api-keys',
    gemini: 'Obtén tu clave en aistudio.google.com/apikey',
    ollama: 'Ollama es local — no requiere API Key externa.',
  };
  return hints[provider] || '';
}
