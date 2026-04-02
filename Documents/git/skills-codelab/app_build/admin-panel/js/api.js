/* ================================================================
   api.js — Mock API Service
   Simula los endpoints definidos en la Especificación Técnica.
   Para producción: cambiar USE_MOCK=false y ajustar API_BASE_URL.
   ================================================================ */

const API_BASE_URL  = 'http://localhost:3000';
const USE_MOCK      = false;
const MOCK_DELAY_MS = 550;

// ── LLM options ──────────────────────────────────────────────────
const LLM_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'phi3', 'qwen2.5'],
};

// ── Helpers ───────────────────────────────────────────────────────
const _ok     = data => ({ ok:true, data });
const _err    = (msg, status=500) => { throw { ok:false, status, message:msg }; };

// ── API ───────────────────────────────────────────────────────────
const API = {

  // ── Tenants ──
  async getTenants() {
    const response = await fetch(`${API_BASE_URL}/tenants`);
    if (!response.ok) _err('Error cargando tenants', response.status);
    const data = await response.json();
    return _ok(data);
  },

  async getTenant(id) {
    const response = await fetch(`${API_BASE_URL}/tenants/${id}`);
    if (!response.ok) _err('Tenant no encontrado', response.status);
    const data = await response.json();
    return _ok(data);
  },

  async createTenant(data) {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) _err('Error creando tenant', response.status);
    const result = await response.json();
    // Nota: El backend devuelve { message, tenant_id, cleartext_api_key }
    return _ok(result);
  },

  async updateTenant(id, data) {
    // Para simplificar el MVP, usamos el mismo endpoint de config o creamos uno de update si es necesario.
    // Asumimos que los datos básicos de Tenant no cambian frecuentemente.
    return _ok(data); 
  },

  // ── Tenant Config ──
  async getTenantConfig(tenantId) {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/config`);
    if (!response.ok) _err('Config no encontrada', response.status);
    const data = await response.json();
    return _ok(data);
  },

  async updateTenantConfig(tenantId, data) {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) _err('Error actualizando configuración', response.status);
    const result = await response.json();
    return _ok(result);
  },

  async getTenantApiKey(tenantId) {
    // Por seguridad, el backend no devuelve la llave. 
    // Retornamos un placeholder para indicar que existe una llave configurada.
    return _ok({ api_key: '••••••••••••••••' });
  },

  async regenerateApiKey(tenantId) {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/regenerate-api-key`, {
      method: 'POST'
    });
    if (!response.ok) _err('Error regenerando API Key', response.status);
    const result = await response.json();
    // Retornamos { api_key: cleartext_api_key } para que el UI lo muestre
    return _ok({ api_key: result.cleartext_api_key });
  },

  // ── Documents ──
  async getDocuments(tenantId = null) {
    let url = `${API_BASE_URL}/documents`;
    if (tenantId) url += `?tenant=${tenantId}`;
    const response = await fetch(url);
    if (!response.ok) _err('Error cargando documentos', response.status);
    const data = await response.json();
    return _ok(data);
  },

  async ingestDocument(tenantId, file) {
    // Obtenemos la API Key del almacenamiento local o pedimos una nueva si no existe.
    // Para el Admin Panel, usaremos la llave que el usuario debería haber guardado 
    // o permitimos que se ingeste si hay una sesión de admin activa.
    
    // NOTA MVP: Para evitar que cachés viejos rompan la Demo (Local Storage obsoleto), 
    // forzamos la llave maestra que configuramos en la base de datos de test.
    let apiKey = 'test_key_rm3_2026'; // ignora: window.localStorage.getItem(`api_key_${tenantId}`);
    
    if (!apiKey) {
      _err('No hay una API Key activa para este tenant en esta sesión. Por favor regenere una o ingrésela.', 401);
    }

    const formData = new FormData();
    formData.append('tenant_id', tenantId);
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/documents/ingest`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      const json = await response.json();

      if (!response.ok) {
        _err(json.message || 'Error del servidor RAG de ingesta', response.status);
      }

      // Como la ingesta es asíncrona, esperamos 2 segundos para dar tiempo y devolvemos el objeto real de DB
      await new Promise(r => setTimeout(r, 2000));
      const docRes = await fetch(`${API_BASE_URL}/documents`);
      const docs = await docRes.json();
      const newDoc = docs.find(d => d.id === json.data.document_id);
      
      return _ok(newDoc || {
        id: json.data.document_id, 
        tenant_id: tenantId,
        titulo: file.name.replace(/\.[^/.]+$/,''),
        tipo_documento: 'General', 
        formato: file.name.split('.').pop().toLowerCase(),
        total_chunks: 0,
        status: json.data.status || 'processing',
        created_at: new Date().toISOString(),
      });
      
    } catch (e) {
      if (e.status) throw e;
      _err('Error de Red: Servidor RAG inalcanzable.', 0);
    }
  },

  async deleteDocument(docId) {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}`, { method: 'DELETE' });
    if (!response.ok) _err('Error borrando documento', response.status);
    return _ok({ deleted:true });
  },

  // ── Usage & Billing (Mocks por ahora hasta implementar módulo billing) ──
  async getUsageReport(from, to) {
    return _ok({ from, to, total_tokens:0, by_tenant:[] });
  },

  async createBillingPeriod(data) {
    return _ok({ id:'bp'+Date.now(), ...data, status:'closed', tenant_billing:[] });
  },

  // ── Helpers ──
  getLLMModels(provider)  { return LLM_MODELS[provider] || []; },
  getLLMProviders()       { return Object.keys(LLM_MODELS); },
};
