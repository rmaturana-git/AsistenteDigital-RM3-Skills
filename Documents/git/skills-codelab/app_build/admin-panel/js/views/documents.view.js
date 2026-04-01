/* documents.view.js */

async function renderDocuments(params) {
  setBreadcrumb('Documentos');
  const el = document.getElementById('view-container');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const { data: tenants }  = await API.getTenants();

  // Read tenant filter from URL query string
  const hash        = window.location.hash;
  const qsMatch     = hash.match(/\?tenant=([^&]+)/);
  let selectedTenant = qsMatch ? qsMatch[1] : '';

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Documentos</h1>
        <p class="page-subtitle">Base de conocimiento RAG — carga y gestión por tenant</p>
      </div>
    </div>

    <!-- Tenant selector + upload -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-header" style="margin-bottom:14px">
        <div class="card-title">Cargar Documento</div>
      </div>

      <div class="form-group">
        <label class="form-label">Tenant de destino <span class="required">*</span></label>
        <select id="upload-tenant" class="form-control" style="max-width:380px">
          <option value="">— Selecciona un tenant —</option>
          ${tenants.map(t => `<option value="${t.id}" ${t.id===selectedTenant?'selected':''}>${t.nombre}</option>`).join('')}
        </select>
      </div>

      <div class="upload-zone" id="upload-zone" tabindex="0" role="button" aria-label="Zona de carga de documentos">
        <div class="upload-icon">📄</div>
        <div class="upload-title">Arrastra archivos aquí o haz clic para seleccionar</div>
        <div class="upload-subtitle">Máximo 50 MB por archivo</div>
        <div class="upload-formats">
          <span class="badge badge-error">PDF</span>
          <span class="badge badge-info">DOCX</span>
          <span class="badge badge-success">XLSX</span>
        </div>
      </div>
      <input type="file" id="file-input" multiple accept=".pdf,.docx,.doc,.xlsx,.xls" style="display:none" />
      <div id="upload-progress" style="margin-top:12px"></div>
    </div>

    <!-- Filters -->
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <select id="filter-tenant" class="form-control" style="width:auto;min-width:200px">
        <option value="">Todos los tenants</option>
        ${tenants.map(t => `<option value="${t.id}" ${t.id===selectedTenant?'selected':''}>${t.nombre}</option>`).join('')}
      </select>
      <select id="filter-status" class="form-control" style="width:auto">
        <option value="">Todos los estados</option>
        <option value="ready">Listo</option>
        <option value="processing">Procesando</option>
        <option value="error">Error</option>
      </select>
      <span id="doc-count" class="text-muted text-sm"></span>
    </div>

    <div class="card mb-0">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Tenant</th>
              <th>Formato</th>
              <th>Chunks</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="docs-tbody">
            <tr><td colspan="7"><div class="loading-center"><div class="spinner"></div></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ── Load and render docs ─────────────────────────────────────
  let allDocs = (await API.getDocuments()).data;
  renderDocsTable(allDocs, tenants, selectedTenant, '');

  // ── Filters ──────────────────────────────────────────────────
  const filterTenant = document.getElementById('filter-tenant');
  const filterStatus = document.getElementById('filter-status');
  const applyFilters = () => renderDocsTable(allDocs, tenants, filterTenant.value, filterStatus.value);
  filterTenant.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);

  // ── Sync tenant selector ─────────────────────────────────────
  document.getElementById('upload-tenant').addEventListener('change', e => {
    filterTenant.value = e.target.value;
    applyFilters();
  });

  // ── Upload zone ───────────────────────────────────────────────
  const zone      = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  zone.addEventListener('click',    () => fileInput.click());
  zone.addEventListener('keydown',  e => { if (e.key==='Enter'||e.key===' ') fileInput.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave',()  => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    uploadFiles(Array.from(e.dataTransfer.files), tenants, allDocs);
  });
  fileInput.addEventListener('change', () => {
    uploadFiles(Array.from(fileInput.files), tenants, allDocs);
    fileInput.value = '';
  });

  async function uploadFiles(files, tenants, allDocs) {
    const tenantId = document.getElementById('upload-tenant').value;
    if (!tenantId) { showToast('Selecciona un tenant antes de cargar', 'warning'); return; }

    const validExts = ['pdf','docx','doc','xlsx','xls'];
    const valid = files.filter(f => validExts.includes(f.name.split('.').pop().toLowerCase()));
    if (!valid.length) { showToast('Formato no soportado. Usa PDF, DOCX o XLSX', 'error'); return; }

    const progress = document.getElementById('upload-progress');
    for (const file of valid) {
      progress.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;font-size:13px;color:var(--text-secondary)">
          <div class="spinner"></div>
          <span>Ingestando <strong>${file.name}</strong>…</span>
        </div>`;
      try {
        const { data: newDoc } = await API.ingestDocument(tenantId, file);
        allDocs.push(newDoc);
        renderDocsTable(allDocs, tenants, filterTenant.value, filterStatus.value);
        progress.innerHTML = '';
        showToast(`"${file.name}" enviado a procesamiento`, 'success');
      } catch (e) {
        progress.innerHTML = '';
        if (e.status === 409) {
          showToast(`⚠️ Duplicado: "${file.name}" ya existe idénticamente en la base RAG.`, 'warning');
        } else if (e.status === 413 || e.status === 400) {
          showToast(`❌ Denegado: "${file.name}" supera el límite OOM o es inválido.`, 'error');
        } else {
          showToast(`Error al ingestar "${file.name}": ${e.message || 'Desconocido'}`, 'error');
        }
      }
    }
  }
}

function renderDocsTable(docs, tenants, tenantFilter, statusFilter) {
  let filtered = docs;
  if (tenantFilter) filtered = filtered.filter(d => d.tenant_id === tenantFilter);
  if (statusFilter) filtered = filtered.filter(d => d.status === statusFilter);

  document.getElementById('doc-count').textContent =
    `${filtered.length} documento${filtered.length!==1?'s':''} encontrado${filtered.length!==1?'s':''}`;

  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.nombre]));
  const fmtIcon   = { pdf:'🔴', docx:'🔵', xlsx:'🟢' };
  const statusBadge = (d) => {
    if (d.status === 'ready')      return `<span class="badge badge-success">✓ Listo</span>`;
    if (d.status === 'processing') return `<span class="badge badge-processing">⟳ Procesando</span>`;
    if (d.status === 'error')      return `<span class="badge badge-error" title="${d.error_message||''}">✗ Error</span>`;
    return `<span class="badge badge-muted">${d.status}</span>`;
  };

  document.getElementById('docs-tbody').innerHTML = filtered.length === 0
    ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◫</div><div class="empty-title">Sin documentos</div><div class="empty-hint">Carga un documento usando el panel superior.</div></div></td></tr>`
    : filtered.map(d => `
        <tr id="doc-row-${d.id}">
          <td>
            <div style="font-weight:500">${d.titulo}</div>
            <div class="td-sub">${d.tipo_documento}</div>
          </td>
          <td class="td-sub">${tenantMap[d.tenant_id] || d.tenant_id}</td>
          <td>
            <span class="badge badge-muted">${fmtIcon[d.formato]||''} ${(d.formato||'').toUpperCase()}</span>
          </td>
          <td class="td-sub">${d.total_chunks > 0 ? d.total_chunks : '—'}</td>
          <td>${statusBadge(d)}
            ${d.status==='error' && d.error_message
              ? `<div class="td-sub" style="margin-top:3px;color:var(--error);font-size:11px">${d.error_message}</div>`
              : ''}
          </td>
          <td class="td-sub">${new Date(d.created_at).toLocaleDateString('es-CL')}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteDoc('${d.id}')">Eliminar</button>
          </td>
        </tr>`).join('');
}

async function deleteDoc(docId) {
  if (!confirm('¿Eliminar este documento? Se eliminarán también todos sus chunks del índice vectorial.')) return;
  try {
    await API.deleteDocument(docId);
    const row = document.getElementById(`doc-row-${docId}`);
    if (row) { row.style.opacity='0'; row.style.transition='opacity 0.3s'; setTimeout(()=>row.remove(), 300); }
    showToast('Documento eliminado del índice', 'success');
  } catch { showToast('Error al eliminar el documento', 'error'); }
}
