/* ================================================================
   app.js — Bootstrap, shared helpers, sidebar, toast system
   ================================================================ */

// ── Shared helpers ────────────────────────────────────────────────
function setBreadcrumb(text) {
  const el = document.getElementById('breadcrumb');
  if (el) el.textContent = text;
}

function showToast(message, type = 'info') {
  const cfg = {
    success: { emoji: '✓', color: 'var(--success)' },
    error:   { emoji: '✗', color: 'var(--error)' },
    warning: { emoji: '⚠', color: 'var(--warning)' },
    info:    { emoji: 'ℹ', color: 'var(--accent)' },
  };
  const { emoji, color } = cfg[type] || cfg.info;

  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--tc', color);
  toast.innerHTML = `
    <span class="toast-emoji">${emoji}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Cerrar">✕</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);

  setTimeout(() => dismissToast(toast), 4500);
}

function dismissToast(toast) {
  if (!toast.parentNode) return;
  toast.style.animation = 'toastOut 0.25s ease forwards';
  setTimeout(() => toast.remove(), 260);
}

// ── Sidebar collapse ──────────────────────────────────────────────
const sidebar       = document.getElementById('sidebar');
const mainContent   = document.getElementById('main-content');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileToggle  = document.getElementById('mobile-toggle');
const overlay       = document.getElementById('sidebar-overlay');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

mobileToggle.addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('visible');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('visible');
});

// ── Router setup ──────────────────────────────────────────────────
Router.register('/',             () => renderDashboard());
Router.register('/tenants',      () => renderTenants());
Router.register('/config/:id',   (p) => renderTenantConfig(p));
Router.register('/documents',    (p) => renderDocuments(p));
Router.register('/billing',      () => renderBilling());
Router.register('/widget-demo',  () => WidgetDemoView.render());

Router.init();
