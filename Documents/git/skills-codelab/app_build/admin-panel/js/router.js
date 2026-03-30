/* ================================================================
   router.js — Hash-based SPA Router
   ================================================================ */

const Router = (() => {
  const routes = {};

  function parseHash() {
    return (window.location.hash || '#/').slice(1) || '/';
  }

  function matchRoute(path) {
    for (const pattern of Object.keys(routes)) {
      const re = new RegExp('^' + pattern.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '$');
      const m  = path.match(re);
      if (m) return { handler: routes[pattern], params: m.groups || {} };
    }
    return null;
  }

  async function render() {
    const path    = parseHash();
    const matched = matchRoute(path);

    const container = document.getElementById('view-container');

    if (!matched) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠</div>
          <div class="empty-title">Página no encontrada</div>
          <div class="empty-hint">La ruta <code>${path}</code> no existe.</div>
        </div>`;
      return;
    }

    // Active nav highlight
    const rootView = path.split('/').filter(Boolean)[0] || 'dashboard';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.nav-item[data-view="${rootView}"]`);
    if (activeEl) activeEl.classList.add('active');

    // Render with fade animation
    container.classList.remove('view-animate');
    void container.offsetWidth; // reflow
    container.classList.add('view-animate');

    await matched.handler(matched.params);
  }

  return {
    register(pattern, handler)  { routes[pattern] = handler; },
    navigate(path)              { window.location.hash = path; },
    init() {
      window.addEventListener('hashchange', render);
      render();
    },
  };
})();
