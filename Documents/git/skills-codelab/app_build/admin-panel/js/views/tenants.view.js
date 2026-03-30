/* tenants.view.js */

async function renderTenants() {
  setBreadcrumb('Tenants');
  const el = document.getElementById('view-container');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const { data: tenants } = await API.getTenants();

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Tenants</h1>
        <p class="page-subtitle">${tenants.length} tenants registrados · ${tenants.filter(t=>t.activo).length} activos</p>
      </div>
      <button class="btn btn-primary" id="btn-new-tenant">+ Nuevo Tenant</button>
    </div>

    <div class="card mb-0">
      <div class="table-wrapper">
        <table id="tenants-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Mandante · Proyecto</th>
              <th>LLM Configurado</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tenants-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- Modal: nuevo tenant -->
    <div id="modal-backdrop" class="modal-backdrop hidden">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Nuevo Tenant</span>
          <button class="btn btn-ghost btn-icon" id="modal-close">✕</button>
        </div>
        <div id="modal-body">
          <div class="form-group">
            <label class="form-label">Nombre del cliente <span class="required">*</span></label>
            <input id="new-nombre" class="form-control" placeholder="Ej: Codelco — División Andina" />
          </div>
          <div class="form-row">
            <div class="form-group mb-0">
              <label class="form-label">Código Mandante <span class="required">*</span></label>
              <input id="new-mandante" class="form-control" placeholder="CODELCO" style="text-transform:uppercase" />
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Código Proyecto <span class="required">*</span></label>
              <input id="new-proyecto" class="form-control" placeholder="ANDINA" style="text-transform:uppercase" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-save">Crear Tenant</button>
        </div>
      </div>
    </div>
  `;

  // Inject modal styles (once)
  if (!document.getElementById('modal-style')) {
    const s = document.createElement('style');
    s.id = 'modal-style';
    s.textContent = `
      .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;}
      .modal-backdrop.hidden{display:none;}
      .modal-box{background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius);padding:0;width:440px;max-width:96vw;box-shadow:0 24px 64px rgba(0,0,0,.5);}
      .modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border-subtle);}
      .modal-title{font-size:15px;font-weight:600;color:var(--text-primary);}
      #modal-body{padding:22px;}
      .modal-footer{display:flex;gap:10px;justify-content:flex-end;padding:14px 22px;border-top:1px solid var(--border-subtle);}
    `;
    document.head.appendChild(s);
  }

  renderTenantsTable(tenants);

  // ── New tenant modal ─────────────────────────────────────────
  const backdrop   = document.getElementById('modal-backdrop');
  const openModal  = () => backdrop.classList.remove('hidden');
  const closeModal = () => backdrop.classList.add('hidden');

  document.getElementById('btn-new-tenant').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click',  closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const nombre   = document.getElementById('new-nombre').value.trim();
    const mandante = document.getElementById('new-mandante').value.trim().toUpperCase();
    const proyecto = document.getElementById('new-proyecto').value.trim().toUpperCase();
    if (!nombre || !mandante || !proyecto) { showToast('Completa todos los campos', 'error'); return; }

    const btn = document.getElementById('modal-save');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creando…';
    try {
      const { data: t } = await API.createTenant({ nombre, mandante_code:mandante, proyecto_code:proyecto, activo:true });
      tenants.push(t);
      renderTenantsTable(tenants);
      closeModal();
      showToast(`Tenant "${t.nombre}" creado exitosamente`, 'success');
    } catch(e) { showToast('Error al crear el tenant', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Crear Tenant'; }
  });
}

function renderTenantsTable(tenants) {
  const providerMap = { t1:'openai', t2:'gemini', t3:'ollama', t4:'openai' };
  const modelMap    = { t1:'GPT-4o Mini', t2:'Gemini 1.5 Flash', t3:'Llama 3.2', t4:'GPT-4o' };

  document.getElementById('tenants-tbody').innerHTML = tenants.length === 0
    ? `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-title">Sin tenants</div></div></td></tr>`
    : tenants.map(t => {
        const prov  = providerMap[t.id] || 'openai';
        const model = modelMap[t.id]    || 'gpt-4o-mini';
        const date  = new Date(t.created_at).toLocaleDateString('es-CL');
        return `
          <tr>
            <td>
              <div style="font-weight:500">${t.nombre}</div>
            </td>
            <td class="td-sub">${t.mandante_code} · ${t.proyecto_code}</td>
            <td>
              <span class="badge badge-${prov}">${prov}</span>
              <div class="td-sub" style="margin-top:3px">${model}</div>
            </td>
            <td>
              <span class="badge ${t.activo ? 'badge-success' : 'badge-muted'}">
                ${t.activo ? '● Activo' : '● Inactivo'}
              </span>
            </td>
            <td class="td-sub">${date}</td>
            <td>
              <div class="gap-2">
                <a href="#/config/${t.id}" class="btn btn-secondary btn-sm">⚙ Configurar</a>
                <a href="#/documents?tenant=${t.id}" class="btn btn-ghost btn-sm">◫ Docs</a>
              </div>
            </td>
          </tr>`;
      }).join('');
}
