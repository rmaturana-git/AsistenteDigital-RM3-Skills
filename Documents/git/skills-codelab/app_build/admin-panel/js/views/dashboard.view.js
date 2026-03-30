/* dashboard.view.js */

async function renderDashboard() {
  setBreadcrumb('Dashboard');
  const el = document.getElementById('view-container');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const [tenantsRes, usageRes] = await Promise.all([
    API.getTenants(),
    API.getUsageReport('2026-03-01', '2026-03-31'),
  ]);
  const tenants      = tenantsRes.data;
  const usage        = usageRes.data;
  const activeTenants = tenants.filter(t => t.activo).length;
  const totalTokens   = usage.total_tokens.toLocaleString('es-CL');

  const activity = [
    { text:'Documento "Requisitos Ingreso EP" indexado',          time:'Hace 2 horas', color:'var(--success)' },
    { text:'LLM actualizado a Gemini 1.5 Flash para BHP',         time:'Hace 5 horas', color:'var(--accent)' },
    { text:'Error al procesar "Listado Documentos Acreditación"', time:'Ayer 16:00',   color:'var(--error)' },
    { text:'Nuevo tenant registrado: Antofagasta Minerals',       time:'Hace 2 días',  color:'var(--warning)' },
    { text:'Periodo de facturación Febrero cerrado',              time:'Hace 5 días',  color:'var(--success)' },
  ];

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Resumen operacional — Marzo 2026</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--sc:var(--accent)">
        <div class="stat-content">
          <span class="stat-label">Tenants Activos</span>
          <span class="stat-value">${activeTenants}</span>
          <span class="stat-trend">de ${tenants.length} registrados</span>
        </div>
        <span class="stat-icon">⬡</span>
      </div>
      <div class="stat-card" style="--sc:var(--success)">
        <div class="stat-content">
          <span class="stat-label">Documentos Indexados</span>
          <span class="stat-value">6</span>
          <span class="stat-trend">+3 este mes</span>
        </div>
        <span class="stat-icon">◫</span>
      </div>
      <div class="stat-card" style="--sc:var(--warning)">
        <div class="stat-content">
          <span class="stat-label">Tokens Consumidos</span>
          <span class="stat-value">${totalTokens}</span>
          <span class="stat-trend">Marzo 2026</span>
        </div>
        <span class="stat-icon">◈</span>
      </div>
      <div class="stat-card" style="--sc:var(--error)">
        <div class="stat-content">
          <span class="stat-label">Errores de Ingestión</span>
          <span class="stat-value">1</span>
          <span class="stat-trend neg">Requiere atención</span>
        </div>
        <span class="stat-icon">⚠</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Consumo de Tokens por Tenant</div>
            <div class="card-subtitle">Mes actual — distribución proporcional</div>
          </div>
        </div>
        <canvas id="tokenChart" height="200"></canvas>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Actividad Reciente</div>
        </div>
        ${activity.map(a => `
          <div class="activity-item">
            <div class="act-dot" style="background:${a.color}"></div>
            <div>
              <div class="act-text">${a.text}</div>
              <div class="act-meta">${a.time}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="card-header">
        <div class="card-title">Tenants — vista rápida</div>
        <a href="#/tenants" class="btn btn-ghost btn-sm">Ver todos →</a>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Tenant</th><th>Mandante / Proyecto</th><th>LLM</th><th>Estado</th><th>Docs</th></tr>
          </thead>
          <tbody>
            ${tenants.map(t => {
              const cfg = { llm_provider: (t.id === 't1' ? 'openai' : t.id === 't2' ? 'gemini' : t.id === 't3' ? 'ollama' : 'openai') };
              const docs = [6,2,1,0,0][['t1','t2','t3','t4'].indexOf(t.id)] || 0;
              return `<tr>
                <td>${t.nombre}</td>
                <td class="td-sub">${t.mandante_code} · ${t.proyecto_code}</td>
                <td><span class="badge badge-${cfg.llm_provider}">${cfg.llm_provider}</span></td>
                <td><span class="badge ${t.activo ? 'badge-success' : 'badge-muted'}">${t.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td class="td-sub">${docs}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ── Draw token bar chart ─────────────────────────────────────
  const canvas  = document.getElementById('tokenChart');
  const ctx     = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  canvas.width  = W;
  canvas.height = 200;

  const labels  = usage.by_tenant.map(u => u.tenant_nombre.split('—')[1]?.trim() || u.tenant_nombre);
  const values  = usage.by_tenant.map(u => u.tokens_total);
  const colors  = ['#6366f1','#10b981','#f59e0b','#8b5cf6'];
  const max     = Math.max(...values);
  const barW    = Math.floor((W - 60) / values.length) - 14;
  const chartH  = 150;
  const baseY   = 170;

  ctx.clearRect(0, 0, W, canvas.height);

  values.forEach((v, i) => {
    const barH = Math.round((v / max) * chartH);
    const x    = 40 + i * (barW + 14);
    const y    = baseY - barH;

    // Bar
    ctx.fillStyle = colors[i % colors.length] + '33';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, 4, [2, 2, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i].slice(0, 8), x + barW / 2, baseY + 16);

    // Value
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText((v / 1000).toFixed(0) + 'K', x + barW / 2, y - 6);
  });

  // Y axis line
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, 10);
  ctx.lineTo(35, baseY);
  ctx.moveTo(35, baseY);
  ctx.lineTo(W - 10, baseY);
  ctx.stroke();
}
