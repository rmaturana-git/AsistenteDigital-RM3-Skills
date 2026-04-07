/* billing.view.js */

async function renderBilling() {
  setBreadcrumb('Facturación');
  const el = document.getElementById('view-container');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const monthName = today.toLocaleDateString('es-ES', { month: 'long' });
  const capMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const { data: usage } = await API.getUsageReport(firstDay, lastDay);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Facturación y Prorrateo</h1>
        <p class="page-subtitle">Modelo de Prorrateo Proporcional — tokens crudos + factura real</p>
      </div>
    </div>

    <div class="alert alert-info">
      ℹ El sistema registra solo <strong>tokens crudos</strong>. Al ingresar la factura real del proveedor, el sistema calcula automáticamente el costo proporcional por tenant.
    </div>

    <!-- Usage summary -->
    <div class="stats-grid" style="margin-bottom:22px">
      <div class="stat-card" style="--sc:var(--accent)">
        <div class="stat-content">
          <span class="stat-label">Total Tokens (${capMonthName})</span>
          <span class="stat-value">${(usage.total_tokens/1000).toFixed(1)}K</span>
          <span class="stat-trend">todos los proveedores</span>
        </div>
        <span class="stat-icon">◈</span>
      </div>
      <div class="stat-card" style="--sc:var(--success)">
        <div class="stat-content">
          <span class="stat-label">Tenants Activos</span>
          <span class="stat-value">${usage.by_tenant.length}</span>
          <span class="stat-trend">en este periodo</span>
        </div>
        <span class="stat-icon">⬡</span>
      </div>
      <div class="stat-card" style="--sc:var(--warning)">
        <div class="stat-content">
          <span class="stat-label">Mayor Consumidor</span>
          <span class="stat-value" style="font-size:16px;margin-top:2px">${usage.by_tenant.sort((a,b)=>b.tokens_total-a.tokens_total)[0]?.tenant_nombre.split('—')[1]?.trim() || '—'}</span>
          <span class="stat-trend">${usage.by_tenant[0]?.usage_percentage}% del total</span>
        </div>
        <span class="stat-icon">▲</span>
      </div>
    </div>

    <div class="grid-2">

      <!-- ── Token usage table ────────────────────────────────── -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Consumo por Tenant</div>
            <div class="card-subtitle">${capMonthName} ${today.getFullYear()} · tokens crudos (sin costo)</div>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th style="text-align:right">Tokens</th>
                <th style="text-align:right">% Uso</th>
              </tr>
            </thead>
            <tbody>
              ${usage.by_tenant.map((u, i) => {
                const colors = ['var(--accent)','var(--success)','var(--warning)','#8b5cf6'];
                const pct = parseFloat(u.usage_percentage);
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:10px;height:10px;border-radius:2px;background:${colors[i%colors.length]};flex-shrink:0"></div>
                        ${u.tenant_nombre}
                      </div>
                    </td>
                    <td style="text-align:right;font-variant-numeric:tabular-nums">
                      ${u.tokens_total.toLocaleString('es-CL')}
                    </td>
                    <td style="text-align:right">
                      <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px">
                        <div style="width:60px;height:4px;border-radius:2px;background:var(--border-default);overflow:hidden">
                          <div style="height:100%;width:${pct}%;background:${colors[i%colors.length]};border-radius:2px"></div>
                        </div>
                        <span style="font-weight:600;min-width:36px;text-align:right">${pct}%</span>
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Invoice form ─────────────────────────────────────── -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Registrar Factura Real</div>
          <div class="card-subtitle">Fase 2: cierre de periodo</div>
        </div>

        <div class="alert alert-warning" style="font-size:12px">
          ⚡ Al registrar una factura, el sistema calcula el costo proporcional por tenant según % de uso real. No se requiere mantener tablas de precios.
        </div>

        <form id="billing-form">
          <div class="form-group">
            <label class="form-label">Proveedor <span class="required">*</span></label>
            <select id="bill-provider" class="form-control">
              <option value="openai">OpenAI</option>
              <option value="gemini">Google (Gemini)</option>
              <option value="ollama-infra">Ollama (Infraestructura)</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Inicio del Periodo</label>
              <input type="date" id="bill-from" class="form-control" value="${firstDay}" />
            </div>
            <div class="form-group">
              <label class="form-label">Fin del Periodo</label>
              <input type="date" id="bill-to" class="form-control" value="${lastDay}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Monto de Factura Real <span class="required">*</span></label>
            <div class="input-unit-wrap">
              <select id="bill-currency" style="background:none;border:none;padding:10px 8px;color:var(--text-secondary);font-family:inherit;font-size:13px;cursor:pointer;outline:none">
                <option value="USD">USD</option>
                <option value="CLP">CLP</option>
                <option value="UF">UF</option>
              </select>
              <input type="number" id="bill-amount" placeholder="0.00" step="0.01" min="0" />
              <span class="input-unit-label">factura del proveedor</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" id="btn-calc" style="width:100%">
            Calcular Prorrateo y Cerrar Periodo
          </button>
        </form>

        <div id="billing-result" style="margin-top:18px"></div>
      </div>

    </div>
  `;

  document.getElementById('billing-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount  = parseFloat(document.getElementById('bill-amount').value);
    if (!amount || amount <= 0) { showToast('Ingresa un monto de factura válido', 'warning'); return; }

    const btn = document.getElementById('btn-calc');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Calculando…';

    try {
      const { data: result } = await API.createBillingPeriod({
        provider:       document.getElementById('bill-provider').value,
        period_start:   document.getElementById('bill-from').value,
        period_end:     document.getElementById('bill-to').value,
        invoice_amount: amount,
        currency:       document.getElementById('bill-currency').value,
      });

      const currency = document.getElementById('bill-currency').value;

      document.getElementById('billing-result').innerHTML = `
        <div style="border-top:1px solid var(--border-subtle);padding-top:16px">
          <div class="card-title" style="margin-bottom:14px">✓ Resultado del Prorrateo</div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr><th>Tenant</th><th style="text-align:right">Tokens</th><th style="text-align:right">% Uso</th><th style="text-align:right">Costo Asignado</th></tr>
              </thead>
              <tbody>
                ${result.tenant_billing.map(tb => `
                  <tr>
                    <td>${tb.tenant_nombre}</td>
                    <td style="text-align:right;font-variant-numeric:tabular-nums">${tb.tokens_total.toLocaleString('es-CL')}</td>
                    <td style="text-align:right"><strong>${tb.usage_percentage}%</strong></td>
                    <td style="text-align:right">
                      <span style="font-weight:700;color:var(--success)">${currency} ${tb.allocated_cost}</span>
                    </td>
                  </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr style="border-top:1px solid var(--border-default)">
                  <td colspan="2"></td>
                  <td style="text-align:right;font-weight:700">100%</td>
                  <td style="text-align:right;font-weight:700;color:var(--accent)">${currency} ${amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
      showToast('Periodo cerrado y prorrateo calculado', 'success');
    } catch (err) {
      showToast('Error al calcular el prorrateo', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Calcular Prorrateo y Cerrar Periodo';
    }
  });
}
