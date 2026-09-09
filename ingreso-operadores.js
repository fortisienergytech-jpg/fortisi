(() => {
  const DESTINO = '/patio-conecta/';
  const TEXTO = 'Ingreso Operadores';

  function yaExiste(root=document) {
    return [...root.querySelectorAll('a')].some(a =>
      (a.textContent || '').trim().toLowerCase() === TEXTO.toLowerCase() ||
      (a.getAttribute('href') || '').includes('/patio-conecta')
    );
  }

  function crearLink(clase='') {
    const a = document.createElement('a');
    a.href = DESTINO;
    a.textContent = TEXTO;
    a.className = clase;
    a.dataset.patioConecta = '1';
    a.style.whiteSpace = 'nowrap';
    return a;
  }

  function insertar() {
    if (yaExiste()) return;

    // Prioridad 1: menú desktop basado en nav con links existentes.
    const navs = [...document.querySelectorAll('header nav, nav, .navbar, .nav, .menu, .menu-links, .nav-links')];
    const objetivo = navs.find(n => n.querySelectorAll('a').length >= 2);

    if (objetivo) {
      const lista = objetivo.querySelector('ul, ol');
      if (lista) {
        const li = document.createElement('li');
        const referencia = lista.querySelector('a');
        li.appendChild(crearLink(referencia ? referencia.className : ''));
        lista.appendChild(li);
      } else {
        const referencia = objetivo.querySelector('a');
        objetivo.appendChild(crearLink(referencia ? referencia.className : ''));
      }
    } else {
      // Fallback seguro: pestaña visible sin romper el HTML existente.
      const a = crearLink();
      a.style.cssText += ';position:fixed;top:18px;right:18px;z-index:99999;padding:10px 14px;border-radius:999px;background:#fff;color:#111;text-decoration:none;font:600 13px Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.18)';
      document.body.appendChild(a);
    }

    // Si existe un menú móvil separado, agrega también la entrada allí.
    const mobileMenus = [...document.querySelectorAll('.mobile-menu, .menu-mobile, .nav-mobile, .drawer, .sidebar-menu')];
    mobileMenus.forEach(m => {
      if (yaExiste(m)) return;
      const ref = m.querySelector('a');
      m.appendChild(crearLink(ref ? ref.className : ''));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', insertar);
  else insertar();
})();