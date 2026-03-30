/* ================================================================
   api.js — Mock API Service
   Simula los endpoints definidos en la Especificación Técnica.
   Para producción: cambiar USE_MOCK=false y ajustar API_BASE_URL.
   ================================================================ */

const API_BASE_URL  = 'http://localhost:3000';
const USE_MOCK      = true;
const MOCK_DELAY_MS = 550;

// ── LLM options ──────────────────────────────────────────────────
const LLM_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'phi3', 'qwen2.5'],
};

// ── Mock dataset ─────────────────────────────────────────────────
const _tenants = [
  { id:'t1', mandante_code:'CODELCO', proyecto_code:'ANDINA',  nombre:'Codelco — División Andina',       activo:true,  created_at:'2026-01-15T09:00:00Z' },
  { id:'t2', mandante_code:'CODELCO', proyecto_code:'CHUQUI',  nombre:'Codelco — Chuquicamata',          activo:true,  created_at:'2026-01-22T10:00:00Z' },
  { id:'t3', mandante_code:'BHPB',    proyecto_code:'ESCOND',  nombre:'BHP Billiton — Minera Escondida', activo:true,  created_at:'2026-02-01T08:30:00Z' },
  { id:'t4', mandante_code:'ANTOFAG', proyecto_code:'MINERA',  nombre:'Antofagasta Minerals',            activo:false, created_at:'2026-02-18T11:00:00Z' },
];

const _configs = {
  t1: { llm_provider:'openai',  llm_model:'gpt-4o-mini',      temperature:0.2, max_context_tokens:4000, rate_limit_user:30,  rate_limit_tenant:200, embedding_model:'text-embedding-3-small' },
  t2: { llm_provider:'gemini',  llm_model:'gemini-1.5-flash', temperature:0.3, max_context_tokens:6000, rate_limit_user:20,  rate_limit_tenant:150, embedding_model:'text-embedding-3-small' },
  t3: { llm_provider:'ollama',  llm_model:'llama3.2',          temperature:0.1, max_context_tokens:3000, rate_limit_user:50,  rate_limit_tenant:300, embedding_model:'text-embedding-3-small' },
  t4: { llm_provider:'openai',  llm_model:'gpt-4o',            temperature:0.5, max_context_tokens:8000, rate_limit_user:10,  rate_limit_tenant:100, embedding_model:'text-embedding-3-small' },
};

const _apiKeys = {
  t1: 'rmk_codelco_andina_a1b2c3d4e5f6',
  t2: 'rmk_codelco_chuqui_b2c3d4e5f6g7',
  t3: 'rmk_bhpb_escond_c3d4e5f6g7h8',
  t4: 'rmk_antofag_minera_d4e5f6g7h8i9',
};

const _documents = [
  { id:'d1', tenant_id:'t1', titulo:'Requisitos Ingreso Empresa Prestadora', tipo_documento:'Normativa',   formato:'pdf',  total_chunks:45,  status:'ready',      created_at:'2026-03-01T10:00:00Z' },
  { id:'d2', tenant_id:'t1', titulo:'Procedimiento PETAR 2026',               tipo_documento:'Procedimiento', formato:'docx', total_chunks:23, status:'ready',      created_at:'2026-03-10T14:30:00Z' },
  { id:'d3', tenant_id:'t1', titulo:'Matriz de Riesgos División Andina',      tipo_documento:'Matriz',      formato:'xlsx', total_chunks:0,   status:'processing', created_at:'2026-03-28T09:00:00Z' },
  { id:'d4', tenant_id:'t2', titulo:'Reglamento Interno Chuquicamata',        tipo_documento:'Reglamento',  formato:'pdf',  total_chunks:87,  status:'ready',      created_at:'2026-02-20T11:00:00Z' },
  { id:'d5', tenant_id:'t2', titulo:'Listado Documentos Acreditación',        tipo_documento:'Checklist',   formato:'xlsx', total_chunks:0,   status:'error',      error_message:'Columna vacía en "Hoja3"', created_at:'2026-03-25T16:00:00Z' },
  { id:'d6', tenant_id:'t3', titulo:'Manual de Seguridad Escondida',         tipo_documento:'Manual',      formato:'pdf',  total_chunks:210, status:'ready',      created_at:'2026-02-28T08:00:00Z' },
];

const _usage = [
  { tenant_id:'t1', tenant_nombre:'Codelco — Andina',    tokens_input:145000, tokens_output:55000,  tokens_total:200000 },
  { tenant_id:'t2', tenant_nombre:'Codelco — Chuqui',    tokens_input:95000,  tokens_output:35000,  tokens_total:130000 },
  { tenant_id:'t3', tenant_nombre:'BHP — Escondida',     tokens_input:210000, tokens_output:90000,  tokens_total:300000 },
  { tenant_id:'t4', tenant_nombre:'Antofagasta Minerals', tokens_input:35000,  tokens_output:15000,  tokens_total:50000  },
];

// ── Helpers ───────────────────────────────────────────────────────
const _delay  = (ms = MOCK_DELAY_MS) => new Promise(r => setTimeout(r, ms));
const _ok     = data => ({ ok:true, data });
const _err    = (msg, status=500) => { throw { ok:false, status, message:msg }; };
const _clone  = obj => JSON.parse(JSON.stringify(obj));

// ── API ───────────────────────────────────────────────────────────
const API = {

  // ── Tenants ──
  async getTenants() {
    await _delay();
    return _ok(_clone(_tenants));
  },

  async getTenant(id) {
    await _delay(250);
    const t = _tenants.find(x => x.id === id);
    if (!t) _err('Tenant no encontrado', 404);
    return _ok(_clone(t));
  },

  async createTenant(data) {
    await _delay();
    const t = { id:'t'+Date.now(), ...data, created_at:new Date().toISOString() };
    _tenants.push(t);
    _configs[t.id]  = { llm_provider:'openai', llm_model:'gpt-4o-mini', temperature:0.2, max_context_tokens:4000, rate_limit_user:30, rate_limit_tenant:200, embedding_model:'text-embedding-3-small' };
    _apiKeys[t.id]  = 'rmk_' + Math.random().toString(36).slice(2);
    return _ok(_clone(t));
  },

  async updateTenant(id, data) {
    await _delay();
    const idx = _tenants.findIndex(x => x.id === id);
    if (idx === -1) _err('Tenant no encontrado', 404);
    Object.assign(_tenants[idx], data);
    return _ok(_clone(_tenants[idx]));
  },

  // ── Tenant Config ──
  async getTenantConfig(tenantId) {
    await _delay(280);
    const c = _configs[tenantId];
    if (!c) _err('Config no encontrada', 404);
    return _ok(_clone(c));
  },

  async updateTenantConfig(tenantId, data) {
    await _delay();
    if (!_configs[tenantId]) _err('Config no encontrada', 404);
    Object.assign(_configs[tenantId], data);
    return _ok(_clone(_configs[tenantId]));
  },

  async getTenantApiKey(tenantId) {
    await _delay(200);
    return _ok({ api_key: _apiKeys[tenantId] || '' });
  },

  async regenerateApiKey(tenantId) {
    await _delay(900);
    const key = 'rmk_' + Math.random().toString(36).slice(2,10) + '_' + Math.random().toString(36).slice(2,8);
    _apiKeys[tenantId] = key;
    return _ok({ api_key: key });
  },

  // ── Documents ──
  async getDocuments(tenantId = null) {
    await _delay();
    let docs = _clone(_documents);
    if (tenantId) docs = docs.filter(d => d.tenant_id === tenantId);
    return _ok(docs);
  },

  async ingestDocument(tenantId, file) {
    await _delay(1100);
    const ext    = file.name.split('.').pop().toLowerCase();
    const fmtMap = { pdf:'pdf', docx:'docx', doc:'docx', xlsx:'xlsx', xls:'xlsx' };
    const doc = {
      id: 'd'+Date.now(), tenant_id:tenantId,
      titulo: file.name.replace(/\.[^/.]+$/,''),
      tipo_documento:'General', formato:fmtMap[ext]||'pdf',
      total_chunks:0, status:'processing', created_at:new Date().toISOString(),
    };
    _documents.push(doc);
    // Simulate async processing completion after 5s
    setTimeout(() => {
      const d = _documents.find(x => x.id === doc.id);
      if (d) { d.status = 'ready'; d.total_chunks = Math.floor(Math.random()*100)+10; }
    }, 5000);
    return _ok(_clone(doc));
  },

  async deleteDocument(docId) {
    await _delay(350);
    const idx = _documents.findIndex(d => d.id === docId);
    if (idx !== -1) _documents.splice(idx, 1);
    return _ok({ deleted:true });
  },

  // ── Usage & Billing ──
  async getUsageReport(from, to) {
    await _delay();
    const total = _usage.reduce((s,u) => s+u.tokens_total, 0);
    const byTenant = _usage.map(u => ({
      ...u,
      usage_percentage: ((u.tokens_total/total)*100).toFixed(1),
    }));
    return _ok({ from, to, total_tokens:total, by_tenant:byTenant });
  },

  async createBillingPeriod(data) {
    await _delay(900);
    const total = _usage.reduce((s,u) => s+u.tokens_total, 0);
    const tenant_billing = _usage.map(u => ({
      tenant_id: u.tenant_id, tenant_nombre: u.tenant_nombre,
      tokens_total: u.tokens_total,
      usage_percentage: ((u.tokens_total/total)*100).toFixed(1),
      allocated_cost: ((u.tokens_total/total)*parseFloat(data.invoice_amount)).toFixed(2),
      currency: data.currency,
    }));
    return _ok({ id:'bp'+Date.now(), ...data, status:'closed', tenant_billing });
  },

  // ── Helpers ──
  getLLMModels(provider)  { return LLM_MODELS[provider] || []; },
  getLLMProviders()       { return Object.keys(LLM_MODELS); },
};
