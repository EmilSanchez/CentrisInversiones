/**
 * UI.JS — Renderizado de vistas v2.2
 * ventaId legible · Detalle producto reorganizado · Dashboard con íconos módulo
 */

// ─── SVG ICONS ────────────────────────────────────────────────────────────

const ICONS = {
  eye: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  sale: `<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  restock: `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  edit: `<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  download: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  box: `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
};

// ─── UTILIDADES UI ────────────────────────────────────────────────────────

const fmt = {
  cop: (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0),
  usd: (n) => `$${(n || 0).toFixed(2)}`,
  num: (n) => new Intl.NumberFormat('es-CO').format(n || 0),
  pct: (n) => `${(n || 0).toFixed(1)}%`,
  fecha: (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  fechaHora: (s) => {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  },
};

function badge(tipo) {
  const map = {
    activo: ['badge-activo', 'Activo'],
    agotado: ['badge-agotado', 'Agotado'],
    pausado: ['badge-pausado', 'Pausado'],
    ok: ['badge-activo', 'OK'],
    bajo: ['badge-bajo', 'Stock bajo'],
  };
  const [cls, label] = map[tipo] || ['badge-pausado', tipo];
  return `<span class="badge ${cls}">${label}</span>`;
}

function imagenProducto(img, nombre, size = 40) {
  if (img) return `<img src="${img}" alt="${nombre}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:6px;">`;
  const letra = (nombre || '?')[0].toUpperCase();
  return `<div class="img-placeholder" style="width:${size}px;height:${size}px;font-size:${size * 0.4}px">${letra}</div>`;
}

function iconoTendencia(ganancia) {
  if (ganancia > 0) return `<span class="trend up">↑</span>`;
  if (ganancia < 0) return `<span class="trend down">↓</span>`;
  return `<span class="trend neutral">→</span>`;
}

function btnIcon(iconKey, title, onclick, extraClass = '') {
  return `<button class="btn-icon ${extraClass}" title="${title}" onclick="${onclick}">${ICONS[iconKey]}</button>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────

async function renderDashboard() {
  const r = await calcularResumenGlobal();
  window._dashData = r;

  const mesActual = r.meses.length > 0 ? r.meses[0].mes : '';
  const ventasIniciales = mesActual
    ? r.ultimasVentas.filter(v => v.fecha && v.fecha.startsWith(mesActual))
    : r.ultimasVentas;

  // Productos únicos con ventas (para el select)
  const productosConVentas = [...r.ultimasVentas.reduce((map, v) => {
    if (!map.has(v.productoId)) map.set(v.productoId, v.producto?.nombre || '—');
    return map;
  }, new Map()).entries()];

  document.querySelector('#main-content').innerHTML = `

    <!-- KPIs del mes/filtro activo — siempre arriba -->
    <div id="dash-kpis-activos"></div>

    <!-- Filtros: mes + producto + limpiar + registrar venta -->
    <div class="dash-filtros-clean">
      <div class="dash-filtro-group">
        <label class="dash-filtro-label">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Mes
        </label>
        <select class="dash-select" id="dash-sel-mes" onchange="dashAplicarFiltros()">
          <option value="">Todos los meses</option>
          ${r.meses.map(m => `<option value="${m.mes}" ${m.mes === mesActual ? 'selected' : ''}>${formatearMesLabel(m.mes)}</option>`).join('')}
        </select>
      </div>
      <div class="dash-filtro-group">
        <label class="dash-filtro-label">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Producto
        </label>
        <select class="dash-select" id="dash-sel-prod" onchange="dashAplicarFiltros()">
          <option value="">Todos los productos</option>
          ${productosConVentas.map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('')}
        </select>
      </div>
      <button class="dash-clear-btn" onclick="dashLimpiarFiltros()" title="Limpiar filtros">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Limpiar
      </button>
      <button class="btn-primary btn-registrar-venta" onclick="openModalVentaDashboard()">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Registrar venta
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 id="dash-tabla-titulo">Ventas — ${formatearMesLabel(mesActual) || 'Todos los meses'}</h3>
        <span id="dash-tabla-count" class="badge-count">${ventasIniciales.length} registros</span>
      </div>
      <div class="table-wrap" style="max-height:560px;overflow-y:auto">
        <table>
          <thead><tr>
            <th>ID Venta</th><th>Producto</th><th>Fecha</th>
            <th>Cliente</th><th>Teléfono</th><th>Cant.</th>
            <th>Precio venta</th><th>Ganancia</th>
          </tr></thead>
          <tbody id="dash-ventas-body">
            ${renderVentasBody(ventasIniciales)}
          </tbody>
        </table>
      </div>
    </div>

    ${r.productosStockBajo.length > 0 ? `
      <button class="stock-alert-fab" onclick="openModalAlertas()" title="Ver alertas de stock">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="white" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="stock-alert-count">${r.productosStockBajo.length}</span>
      </button>` : ''}
  `;

  window._productosStockBajo = r.productosStockBajo;
  dashMostrarKpis(mesActual, '');
}

function dashAplicarFiltros() {
  const mes = document.getElementById('dash-sel-mes')?.value || '';
  const prod = document.getElementById('dash-sel-prod')?.value || '';
  const r = window._dashData;
  if (!r) return;

  let ventas = r.ultimasVentas;
  if (mes) ventas = ventas.filter(v => v.fecha && v.fecha.startsWith(mes));
  if (prod) ventas = ventas.filter(v => v.productoId === prod);

  const nombreProd = prod ? r.ultimasVentas.find(v => v.productoId === prod)?.producto?.nombre : '';
  let titulo = 'Todas las ventas';
  if (mes && nombreProd) titulo = `${nombreProd} — ${formatearMesLabel(mes)}`;
  else if (mes) titulo = `Ventas — ${formatearMesLabel(mes)}`;
  else if (nombreProd) titulo = `Ventas — ${nombreProd}`;

  document.getElementById('dash-tabla-titulo').textContent = titulo;
  document.getElementById('dash-tabla-count').textContent = `${ventas.length} registros`;

  // Animar salida de filas y entrada de nuevas
  const tbody = document.getElementById('dash-ventas-body');
  if (tbody) {
    tbody.style.opacity = '0';
    tbody.style.transform = 'translateY(6px)';
    tbody.style.transition = 'opacity .18s ease, transform .18s ease';
    setTimeout(() => {
      tbody.innerHTML = renderVentasBody(ventas);
      tbody.style.opacity = '1';
      tbody.style.transform = 'translateY(0)';
    }, 180);
  }

  dashMostrarKpis(mes, prod);
}

function dashLimpiarFiltros() {
  const selMes = document.getElementById('dash-sel-mes');
  const selProd = document.getElementById('dash-sel-prod');
  if (selMes) selMes.value = '';
  if (selProd) selProd.value = '';
  dashAplicarFiltros();
}

// ─── CONTADOR ANIMADO ─────────────────────────────────────────────────────
function animarContador(el, desde, hasta, duracion, esCOP = false) {
  if (!el) return;
  const inicio = performance.now();
  const diff = hasta - desde;
  const easing = t => t < .5 ? 2*t*t : -1+(4-2*t)*t; // ease-in-out quad

  function step(ahora) {
    const elapsed = ahora - inicio;
    const t = Math.min(elapsed / duracion, 1);
    const valor = Math.round(desde + diff * easing(t));
    el.textContent = esCOP
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor)
      : new Intl.NumberFormat('es-CO').format(valor);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function dashMostrarKpis(mes, prod = '') {
  const r = window._dashData;
  const container = document.getElementById('dash-kpis-activos');
  if (!container || !r) return;

  let ventas = r.ultimasVentas;
  if (mes)  ventas = ventas.filter(v => v.fecha && v.fecha.startsWith(mes));
  if (prod) ventas = ventas.filter(v => v.productoId === prod);

  const totalFilt = ventas.reduce((s, v) => s + (v.cantidad * v.precioUnitario), 0);
  const ganFilt   = ventas.reduce((s, v) => s + (v.gananciaVenta || 0), 0);
  const unidFilt  = ventas.reduce((s, v) => s + (v.cantidad || 0), 0);
  const ganPos    = ganFilt >= 0;

  // Leer valores previos para animar desde ellos
  const prev = window._dashKpiPrev || { ventas: 0, unidades: 0, total: 0, ganancia: 0 };

  // Si ya existe el grid solo animar los valores, si no renderizar HTML completo
  const existente = container.querySelector('.dash-kpi-grid');

  if (!existente) {
    container.innerHTML = `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card dash-kpi-ventas">
          <div class="dash-kpi-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div class="dash-kpi-body">
            <span class="dash-kpi-label">Ventas</span>
            <span class="dash-kpi-value" id="kpi-val-ventas">0</span>
            <span class="dash-kpi-sub">transacciones</span>
          </div>
          <div class="dash-kpi-glow"></div>
        </div>

        <div class="dash-kpi-card dash-kpi-unidades">
          <div class="dash-kpi-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div class="dash-kpi-body">
            <span class="dash-kpi-label">Unidades vendidas</span>
            <span class="dash-kpi-value" id="kpi-val-unidades">0</span>
            <span class="dash-kpi-sub">unidades</span>
          </div>
          <div class="dash-kpi-glow"></div>
        </div>

        <div class="dash-kpi-card dash-kpi-ingresos">
          <div class="dash-kpi-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="dash-kpi-body">
            <span class="dash-kpi-label">Total ingresado</span>
            <span class="dash-kpi-value" id="kpi-val-total">$ 0</span>
            <span class="dash-kpi-sub">ingresos brutos</span>
          </div>
          <div class="dash-kpi-glow"></div>
        </div>

        <div class="dash-kpi-card dash-kpi-ganancia" id="kpi-card-gan">
          <div class="dash-kpi-icon-wrap" id="kpi-icon-gan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div class="dash-kpi-body">
            <span class="dash-kpi-label">Ganancia neta</span>
            <span class="dash-kpi-value" id="kpi-val-ganancia">$ 0</span>
            <span class="dash-kpi-sub" id="kpi-sub-gan">beneficio</span>
          </div>
          <div class="dash-kpi-glow"></div>
        </div>
      </div>`;

    // Animar entrada de cards
    const cards = container.querySelectorAll('.dash-kpi-card');
    cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(12px)';
      c.style.transition = `opacity .3s ease ${i * 60}ms, transform .3s ease ${i * 60}ms`;
      requestAnimationFrame(() => {
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      });
    });
  }

  // Actualizar card de ganancia si cambió positivo/negativo
  const cardGan = document.getElementById('kpi-card-gan');
  const iconGan = document.getElementById('kpi-icon-gan');
  const subGan  = document.getElementById('kpi-sub-gan');
  if (cardGan) {
    cardGan.className = `dash-kpi-card ${ganPos ? 'dash-kpi-ganancia' : 'dash-kpi-perdida'}`;
  }
  if (iconGan) {
    iconGan.innerHTML = ganPos
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;
  }
  if (subGan) subGan.textContent = ganPos ? 'beneficio' : 'pérdida';

  // Animar números desde valor anterior al nuevo
  const DUR = 600;
  animarContador(document.getElementById('kpi-val-ventas'),   prev.ventas,   ventas.length, DUR, false);
  animarContador(document.getElementById('kpi-val-unidades'), prev.unidades, unidFilt,      DUR, false);
  animarContador(document.getElementById('kpi-val-total'),    prev.total,    totalFilt,     DUR, true);
  animarContador(document.getElementById('kpi-val-ganancia'), prev.ganancia, ganFilt,       DUR, true);

  // Guardar para la próxima animación
  window._dashKpiPrev = { ventas: ventas.length, unidades: unidFilt, total: totalFilt, ganancia: ganFilt };
}

// Modal para registrar venta desde dashboard (primero seleccionar producto)
async function openModalVentaDashboard() {
  startProgress();
  const productos = await getProductosEnriquecidos();
  const activos = productos.filter(p => p.stockActual > 0);

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-picker">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="picker-header-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div>
            <h2 style="margin:0;font-size:1rem">Registrar venta</h2>
            <p style="margin:0;font-size:.75rem;color:var(--text-muted);font-weight:400">Selecciona el producto a vender</p>
          </div>
        </div>
        <button class="modal-close" onclick="closeModal()">&#x2715;</button>
      </div>

      <div class="picker-search-wrap">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="picker-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="picker-search" placeholder="Buscar por nombre o SKU..." oninput="filtrarPicker(this.value)" class="picker-search-input">
        <span id="picker-count" class="picker-count">${activos.length} productos</span>
      </div>

      <div class="picker-list-wrap">
        ${activos.length === 0
          ? '<div class="picker-empty"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg><p>No hay productos con stock disponible</p></div>'
          : '<div id="prod-picker-list" class="prod-picker-list">' +
            activos.map(p => `
              <div class="prod-picker-item" onclick="closeModal(); openModalVenta('${p.id}')">
                <div class="prod-picker-img">${imagenProducto(p.imagen, p.nombre, 44)}</div>
                <div class="prod-picker-info">
                  <div class="prod-picker-nombre">${p.nombre}</div>
                  <div class="prod-picker-meta">
                    <span class="sku-small">${p.sku}</span>
                    <span class="prod-picker-stock-badge ${p.stockActual <= 3 ? 'stock-bajo' : ''}">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      ${p.stockActual} en stock
                    </span>
                    ${p.precioSugerido ? `<span class="prod-picker-precio">${fmt.cop(p.precioSugerido)}</span>` : ''}
                  </div>
                </div>
                <div class="prod-picker-arrow-wrap">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>`).join('') + '</div>'}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      </div>
    </div>
  `;
  openModalAnimate();
  doneProgress();
  setTimeout(() => document.getElementById('picker-search')?.focus(), 100);
}

function filtrarPicker(q) {
  const items = document.querySelectorAll('.prod-picker-item');
  const ql = q.toLowerCase().trim();
  let visible = 0;
  items.forEach(item => {
    const nombre = item.querySelector('.prod-picker-nombre')?.textContent.toLowerCase() || '';
    const sku = item.querySelector('.sku-small')?.textContent.toLowerCase() || '';
    const show = !ql || nombre.includes(ql) || sku.includes(ql);
    item.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const cnt = document.getElementById('picker-count');
  if (cnt) cnt.textContent = visible + ' producto' + (visible !== 1 ? 's' : '');
}


function formatearMesLabel(mesStr) {
  if (!mesStr || mesStr === 'sin-fecha') return 'Sin fecha';
  const [anio, mes] = mesStr.split('-');
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${nombres[parseInt(mes, 10) - 1]} ${anio}`;
}

function renderVentasBody(ventas) {
  if (!ventas || ventas.length === 0) return '<tr><td colspan="8" class="empty">Sin ventas en este período</td></tr>';
  return ventas.map(v => `
    <tr onclick="navigate('detalle-producto','${v.productoId}')" class="clickable">
      <td><code class="sku">${v.ventaId || '—'}</code></td>
      <td>
        <div class="cell-producto">
          ${imagenProducto(v.producto?.imagen, v.producto?.nombre)}
          <span>${v.producto?.nombre || '—'}</span>
        </div>
      </td>
      <td>${fmt.fecha(v.fecha)}</td>
      <td>${v.cliente || '—'}</td>
      <td>${v.telefono || '—'}</td>
      <td>${v.cantidad}</td>
      <td>${fmt.cop(v.precioUnitario)}</td>
      <td class="${v.gananciaVenta >= 0 ? 'text-success' : 'text-danger'}">${fmt.cop(v.gananciaVenta)}</td>
    </tr>`).join('');
}

function actualizarKpisMes(mes) {
  const r = window._dashData;
  if (!r) return;
  const datosMes = r.meses.find(m => m.mes === mes);
  const container = document.getElementById('dash-mes-kpis');
  if (!container) return;
  if (!datosMes) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="mes-kpi-strip">
      <div class="mes-kpi-item">
        <span class="mes-kpi-label">Ventas del mes</span>
        <span class="mes-kpi-valor">${datosMes.numVentas}</span>
      </div>
      <div class="mes-kpi-item">
        <span class="mes-kpi-label">Unidades vendidas</span>
        <span class="mes-kpi-valor">${fmt.num(datosMes.unidades)}</span>
      </div>
      <div class="mes-kpi-item">
        <span class="mes-kpi-label">Total ingresado</span>
        <span class="mes-kpi-valor text-success">${fmt.cop(datosMes.total)}</span>
      </div>
      <div class="mes-kpi-item">
        <span class="mes-kpi-label">Ganancia del mes</span>
        <span class="mes-kpi-valor ${datosMes.ganancia >= 0 ? 'text-success' : 'text-danger'}">${fmt.cop(datosMes.ganancia)}</span>
      </div>
    </div>`;
}

function filtrarVentasMes(mes) {
  window._dashMesSeleccionado = mes;
  const r = window._dashData;
  if (!r) return;
  const ventasFiltradas = mes
    ? r.ultimasVentas.filter(v => v.fecha && v.fecha.startsWith(mes))
    : r.ultimasVentas;
  document.getElementById('dash-ventas-body').innerHTML = renderVentasBody(ventasFiltradas);
  actualizarKpisMes(mes);
}

// SVG icons por tipo de KPI
const KPI_ICONS = {
  invest: `<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  recover: `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  profit:  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12l4-4 4 4"/></svg>`,
  box:     `<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  stock:   `<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  sold:    `<svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
};

function kpiCard(label, valor, iconKey, colorClass) {
  const svg = KPI_ICONS[iconKey] || KPI_ICONS.box;
  return `
    <div class="kpi-card ${colorClass}">
      <div class="kpi-icon-wrap">${svg}</div>
      <div class="kpi-info">
        <div class="kpi-label">${label}</div>
        <div class="kpi-valor">${valor}</div>
      </div>
    </div>`;
}

// ─── LISTADO PRODUCTOS ────────────────────────────────────────────────────

async function renderProductos(filtros = {}) {
  let productos = await getProductosEnriquecidos();
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase();
    productos = productos.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }
  if (filtros.categoria) productos = productos.filter(p => p.categoria === filtros.categoria);
  if (filtros.estado) productos = productos.filter(p => p.estado === filtros.estado);
  if (filtros.orden === 'inversion') productos.sort((a, b) => b.inversionTotal - a.inversionTotal);
  else if (filtros.orden === 'ganancia') productos.sort((a, b) => b.ganancia - a.ganancia);
  else if (filtros.orden === 'stock') productos.sort((a, b) => b.stockActual - a.stockActual);
  else if (filtros.orden === 'nombre') productos.sort((a, b) => a.nombre?.localeCompare(b.nombre));

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Productos</h1>
      <button class="btn-primary" onclick="openModalProducto()">+ Nuevo producto</button>
    </div>

    <div class="filtros-bar">
      <input type="text" id="f-busqueda" placeholder="Buscar por nombre o SKU…" value="${filtros.busqueda || ''}"
        oninput="aplicarFiltros()" class="input-search">
      <select id="f-categoria" onchange="aplicarFiltros()">
        <option value="">Todas las categorías</option>
        ${categorias.map(c => `<option value="${c}" ${filtros.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="f-estado" onchange="aplicarFiltros()">
        <option value="">Todos los estados</option>
        <option value="activo" ${filtros.estado === 'activo' ? 'selected' : ''}>Activo</option>
        <option value="agotado" ${filtros.estado === 'agotado' ? 'selected' : ''}>Agotado</option>
        <option value="pausado" ${filtros.estado === 'pausado' ? 'selected' : ''}>Pausado</option>
      </select>
      <select id="f-orden" onchange="aplicarFiltros()">
        <option value="">Ordenar por…</option>
        <option value="nombre" ${filtros.orden === 'nombre' ? 'selected' : ''}>Nombre</option>
        <option value="inversion" ${filtros.orden === 'inversion' ? 'selected' : ''}>Mayor inversión</option>
        <option value="ganancia" ${filtros.orden === 'ganancia' ? 'selected' : ''}>Mayor ganancia</option>
        <option value="stock" ${filtros.orden === 'stock' ? 'selected' : ''}>Mayor stock</option>
      </select>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Comprado</th>
              <th>Vendido</th>
              <th>Stock</th>
              <th>Inversión</th>
              <th>Recuperado</th>
              <th>Ganancia</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${productos.length === 0
              ? '<tr><td colspan="10" class="empty">No se encontraron productos</td></tr>'
              : productos.map(p => `
                <tr class="clickable" onclick="navigate('detalle-producto','${p.id}')">
                  <td>
                    <div class="cell-producto">
                      ${imagenProducto(p.imagen, p.nombre, 36)}
                      <div>
                        <div class="fw600">${p.nombre}</div>
                        <div class="small-text text-muted">${p.categoria || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td><code class="sku">${p.sku}</code></td>
                  <td>${fmt.num(p.cantidad)}</td>
                  <td>${fmt.num(p.unidadesVendidas)}</td>
                  <td class="${p.estadoStock === 'bajo' ? 'text-warning' : p.estadoStock === 'agotado' ? 'text-danger' : ''}">${fmt.num(p.stockActual)}</td>
                  <td>${fmt.cop(p.inversionTotal)}</td>
                  <td>${fmt.cop(p.totalRecuperado)}</td>
                  <td class="${p.ganancia >= 0 ? 'text-success' : 'text-danger'}">${iconoTendencia(p.ganancia)} ${fmt.cop(p.ganancia)}</td>
                  <td>${badge(p.estado)}</td>
                  <td>
                    <div class="action-btns" onclick="event.stopPropagation()">
                      ${btnIcon('sale', 'Venta', `openModalVenta('${p.id}')`)}
                      ${btnIcon('restock', 'Reponer stock', `openModalReponerStock('${p.id}')`)}
                      ${btnIcon('edit', 'Editar', `openModalProducto('${p.id}')`)}
                      ${btnIcon('trash', 'Eliminar', `confirmarEliminar('${p.id}')`, 'btn-danger')}
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── DETALLE PRODUCTO (reorganizado: KPIs arriba, historial limpio) ───────

async function renderDetalleProducto(id) {
  startProgress();
  _cache.productos = null;
  _cache.ventas = null;

  const p = await getProductoEnriquecido(id);
  if (!p) { navigate('productos'); return; }

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <button class="btn-back" onclick="navigate('productos')">← Volver</button>
      <h1>${p.nombre}</h1>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="openModalProducto('${p.id}')">Editar</button>
        <button class="btn-secondary" onclick="openModalReponerStock('${p.id}')">Reponer stock</button>
        <button class="btn-primary" onclick="openModalVenta('${p.id}')">+ Registrar venta</button>
      </div>
    </div>

    <!-- KPI cards arriba como dashboard -->
    <div class="kpi-grid" style="margin-bottom:20px">
      ${kpiCard('Inversión total', fmt.cop(p.inversionTotal), 'invest', 'kpi-blue')}
      ${kpiCard('Costo unitario', fmt.cop(p.costoUnitario), 'box', 'kpi-slate')}
      ${kpiCard('Total recuperado', fmt.cop(p.totalRecuperado), 'recover', 'kpi-green')}
      ${kpiCard('Ganancia', fmt.cop(p.ganancia), 'profit', p.ganancia >= 0 ? 'kpi-teal' : 'kpi-red')}
      ${kpiCard('Stock actual', `${fmt.num(p.stockActual)} uds`, 'stock', 'kpi-orange')}
      ${kpiCard('Uds. vendidas', `${fmt.num(p.unidadesVendidas)} / ${p.cantidad}`, 'sold', 'kpi-purple')}
    </div>

    <!-- Info del producto en tabla -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <h3>Información del producto</h3>
      </div>
      <div style="display:flex;align-items:flex-start;gap:20px;padding:20px">
        <div style="flex-shrink:0">
          ${p.imagen
            ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:80px;height:80px;object-fit:cover;border-radius:8px">`
            : `<div class="img-placeholder" style="width:80px;height:80px;font-size:32px">${p.nombre[0].toUpperCase()}</div>`}
        </div>
        <div class="table-wrap" style="flex:1">
          <table class="tabla-detalle">
            <tbody>
              <tr><td class="td-label">SKU</td><td><code class="sku">${p.sku}</code></td><td class="td-label">Categoría</td><td>${p.categoria || '—'}</td></tr>
              <tr><td class="td-label">Proveedor</td><td>${p.proveedor || '—'}</td><td class="td-label">Estado</td><td>${badge(p.estado)}</td></tr>
              <tr><td class="td-label">Precio sugerido</td><td class="fw600">${fmt.cop(p.precioSugerido)}</td><td class="td-label">Recuperación</td><td>${fmt.pct(p.recuperacionPct)} de la inversión</td></tr>
              ${p.descripcion ? `<tr><td class="td-label">Descripción</td><td colspan="3"><em class="text-muted">${p.descripcion}</em></td></tr>` : ''}
              ${p.link ? `<tr><td class="td-label">Link</td><td colspan="3"><a href="${p.link}" target="_blank" class="link">Ver en tienda</a></td></tr>` : ''}
              ${p.ubicacion ? `<tr><td class="td-label">Ubicación bodega</td><td colspan="3">${p.ubicacion}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Historial de ventas -->
    <div class="card mt20">
      <div class="card-header">
        <h3>Historial de ventas</h3>
        <span class="text-muted small-text">${p.ventas.length} registros</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>ID Venta</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Cant.</th>
              <th>Observación</th>
              <th>Costo unit.</th>
              <th>Precio venta</th>
              <th>Ganancia</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${p.ventas.length === 0
              ? '<tr><td colspan="10" class="empty">Sin ventas registradas</td></tr>'
              : [...p.ventas].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(v => {
                  const gananciaV = (v.precioUnitario - p.costoUnitario) * v.cantidad;
                  return `
                  <tr>
                    <td>${fmt.fecha(v.fecha)}</td>
                    <td><code class="sku">${v.ventaId || '—'}</code></td>
                    <td>${v.cliente || '—'}</td>
                    <td>${v.telefono || '—'}</td>
                    <td>${v.cantidad}</td>
                    <td class="text-muted">${v.obs || '—'}</td>
                    <td>${fmt.cop(p.costoUnitario)}</td>
                    <td>${fmt.cop(v.precioUnitario)}</td>
                    <td class="${gananciaV >= 0 ? 'text-success' : 'text-danger'}">${fmt.cop(gananciaV)}</td>
                    <td>
                      <div class="action-btns">
                        ${btnIcon('edit', 'Editar venta', `openModalEditarVenta('${v.id}','${p.id}')`)}
                        ${btnIcon('trash', 'Eliminar', `eliminarVenta('${v.id}','${p.id}')`, 'btn-danger')}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  doneProgress();
}

async function openModalEditarMovimiento(movId) {
  startProgress();
  const movimientos = await getMovimientos();
  const m = movimientos.find(x => x.id === movId);
  if (!m) { mostrarAlerta('Movimiento no encontrado.', 'error'); return; }

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Editar movimiento</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="form-editar-mov" onsubmit="return false">
          <input type="hidden" name="movId" value="${m.id}">
          <div class="form-group">
            <label>Descripción</label>
            <input type="text" name="descripcion" value="${m.descripcion || ''}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Costo productos (COP)</label>
              <input type="number" name="costoProductos" value="${m.costoProductos || 0}" min="0">
            </div>
            <div class="form-group">
              <label>Costo envío (COP)</label>
              <input type="number" name="costoEnvio" value="${m.costoEnvio || 0}" min="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Otros costos (COP)</label>
              <input type="number" name="otrosCostos" value="${m.otrosCostos || 0}" min="0">
            </div>
            <div class="form-group">
              <label>Cantidad</label>
              <input type="number" name="cantidad" value="${m.cantidad || 0}" min="0">
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionMovimiento()">Guardar cambios</button>
      </div>
    </div>
  `;
  openModalAnimate();
  doneProgress();
}

// ─── MOVIMIENTOS ──────────────────────────────────────────────────────────

async function renderMovimientos() {
  const movimientos = await getMovimientos();

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Movimientos</h1>
      <span class="subtitle">Historial de inversiones, reposiciones y costos</span>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Descripción</th>
              <th>Costo productos</th>
              <th>Costo envío</th>
              <th>Otros costos</th>
              <th>Total COP</th>
              <th>Cant.</th>     
              <th style="width:48px"></th>         
            </tr>
            
          </thead>
          <tbody>
            ${movimientos.length === 0
              ? '<tr><td colspan="9" class="empty">Sin movimientos registrados</td></tr>'
              : movimientos.map(m => `
                <tr>
                  <td style="white-space:nowrap">${fmt.fechaHora(m.fechaHora)}</td>
                  <td><span class="mov-tipo ${m.tipo}">${tipoMovLabel(m.tipo)}</span></td>
                  <td class="fw600">${m.productoNombre || '—'}</td>
                  <td class="text-muted">${m.descripcion || '—'}</td>
                  <td>${fmt.cop(m.costoProductos || 0)}</td>
                  <td>${fmt.cop(m.costoEnvio || 0)}</td>
                  <td>${fmt.cop(m.otrosCostos || 0)}</td>
                  <td class="fw600">${fmt.cop(m.totalCOP || 0)}</td>
                  <td>${m.cantidad || '—'}</td>
                  <td>
                    <div class="action-btns">
                      ${btnIcon('edit', 'Editar', `openModalEditarMovimiento('${m.id}')`)}
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function tipoMovLabel(tipo) {
  const map = {
    inversion: 'Inversión',
    reposicion: 'Reposición',
    venta: 'Venta',
    envio: 'Envío',
  };
  return map[tipo] || tipo;
}

// ─── REPORTES ─────────────────────────────────────────────────────────────

async function renderReportes() {
  const r = await getReportes();
  const res = await calcularResumenGlobal();

  // Totales globales para las cards resumen
  const totInv = res.totalInvertido;
  const totRec = res.totalRecuperado;
  const totGan = res.gananciaTotal;
  const pctRec = totInv > 0 ? (totRec / totInv * 100).toFixed(1) : 0;

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1>Reportes</h1>
        <span class="subtitle">Analisis financiero y de ventas</span>
      </div>
      <button class="btn-primary" onclick="openModalReporte()">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Descargar reporte
      </button>
    </div>

    <!-- Resumen financiero global en 4 tarjetas grandes -->
    <div class="rep-resumen-grid">
      <div class="rep-resumen-card rep-card-inv">
        <div class="rep-resumen-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="rep-resumen-body">
          <div class="rep-resumen-label">Total Invertido</div>
          <div class="rep-resumen-valor">${fmt.cop(totInv)}</div>
          <div class="rep-resumen-sub">${res.totalProductos} productos</div>
        </div>
      </div>
      <div class="rep-resumen-card rep-card-rec">
        <div class="rep-resumen-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="rep-resumen-body">
          <div class="rep-resumen-label">Total Recuperado</div>
          <div class="rep-resumen-valor">${fmt.cop(totRec)}</div>
          <div class="rep-resumen-sub">${pctRec}% de la inversión</div>
        </div>
      </div>
      <div class="rep-resumen-card ${totGan >= 0 ? 'rep-card-gan' : 'rep-card-neg'}">
        <div class="rep-resumen-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12l4-4 4 4"/></svg>
        </div>
        <div class="rep-resumen-body">
          <div class="rep-resumen-label">Ganancia Total</div>
          <div class="rep-resumen-valor">${fmt.cop(totGan)}</div>
          <div class="rep-resumen-sub">${res.unidadesTotalesVendidas} unidades vendidas</div>
        </div>
      </div>
      <div class="rep-resumen-card rep-card-stock">
        <div class="rep-resumen-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <div class="rep-resumen-body">
          <div class="rep-resumen-label">Stock Disponible</div>
          <div class="rep-resumen-valor">${fmt.num(res.unidadesTotalesStock)}</div>
          <div class="rep-resumen-sub">${r.agotados.length} productos agotados</div>
        </div>
      </div>
    </div>

    <!-- Tabs con iconos -->
    <div class="reportes-tabs-wrap">
      <div class="reportes-tabs">
        <button class="tab active" onclick="switchTab(this,'rep-meses')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Por mes
        </button>
        <button class="tab" onclick="switchTab(this,'rep-inversion')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Mayor inversión
        </button>
        <button class="tab" onclick="switchTab(this,'rep-ganancia')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          Mayor ganancia
        </button>
        <button class="tab" onclick="switchTab(this,'rep-movimiento')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Menos movimiento
        </button>
        <button class="tab" onclick="switchTab(this,'rep-categorias')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Por categoría
        </button>
        <button class="tab" onclick="switchTab(this,'rep-agotados')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          Agotados ${r.agotados.length > 0 ? `<span class="tab-badge">${r.agotados.length}</span>` : ''}
        </button>
      </div>
    </div>

    <div id="rep-meses" class="tab-content active card">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-cal"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Resumen mensual de ventas</h3>
          <p class="rep-tab-desc">Ventas, unidades y ganancias agrupadas por mes</p>
        </div>
        <div class="rep-tab-stat-right">
          <span class="rep-stat-badge">${r.meses.length} meses</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Mes</th><th>N° ventas</th><th>Unidades</th><th>Total ingresado</th><th>Ganancia del mes</th></tr></thead>
          <tbody>
            ${r.meses.length === 0
              ? '<tr><td colspan="6" class="empty">Sin ventas registradas</td></tr>'
              : r.meses.map((m, i) => `
                <tr>
                  <td class="rank">${i + 1}</td>
                  <td class="fw600">${formatearMesLabel(m.mes)}</td>
                  <td>${m.numVentas}</td>
                  <td>${m.unidades}</td>
                  <td class="text-success fw600">${fmt.cop(m.total)}</td>
                  <td class="${m.ganancia >= 0 ? 'text-success' : 'text-danger'} fw600">${fmt.cop(m.ganancia)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="rep-inversion" class="tab-content card" style="display:none">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-inv"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Productos con mayor inversión</h3>
          <p class="rep-tab-desc">Ranking por capital invertido total</p>
        </div>
        <div class="rep-tab-stat-right">
          <span class="rep-stat-badge">${r.mayorInversion.length} productos</span>
        </div>
      </div>
      ${tablaRanking(r.mayorInversion, 'inversionTotal', 'Inversión')}
    </div>

    <div id="rep-ganancia" class="tab-content card" style="display:none">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-gan"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Productos con mayor ganancia</h3>
          <p class="rep-tab-desc">Ranking por rentabilidad generada</p>
        </div>
        <div class="rep-tab-stat-right">
          <span class="rep-stat-badge">${r.mayorGanancia.length} productos</span>
        </div>
      </div>
      ${tablaRanking(r.mayorGanancia, 'ganancia', 'Ganancia')}
    </div>

    <div id="rep-movimiento" class="tab-content card" style="display:none">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-mov"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Productos con menos movimiento</h3>
          <p class="rep-tab-desc">Productos que menos se han vendido</p>
        </div>
      </div>
      ${tablaRanking(r.menosMovimiento, 'numVentas', 'N° ventas', true)}
    </div>

    <div id="rep-categorias" class="tab-content card" style="display:none">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-cat"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Resumen por categoría</h3>
          <p class="rep-tab-desc">Inversión y rentabilidad agrupada por categoría</p>
        </div>
        <div class="rep-tab-stat-right">
          <span class="rep-stat-badge">${r.categorias.length} categorías</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Categoría</th><th>Productos</th><th>Inversión</th><th>Recuperado</th><th>Ganancia</th></tr></thead>
          <tbody>
            ${r.categorias.length === 0 ? '<tr><td colspan="5" class="empty">Sin categorías</td></tr>' :
              r.categorias.map(c => `
                <tr>
                  <td class="fw600">${c.nombre}</td>
                  <td>${c.productos}</td>
                  <td>${fmt.cop(c.inversion)}</td>
                  <td>${fmt.cop(c.recuperado)}</td>
                  <td class="${c.ganancia >= 0 ? 'text-success' : 'text-danger'} fw600">${fmt.cop(c.ganancia)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="rep-agotados" class="tab-content card" style="display:none">
      <div class="rep-tab-header">
        <div class="rep-tab-icon rep-icon-agot"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
        <div>
          <h3 class="rep-tab-titulo">Productos agotados</h3>
          <p class="rep-tab-desc">Productos sin stock disponible — requieren reposición</p>
        </div>
        <div class="rep-tab-stat-right">
          <span class="rep-stat-badge rep-badge-red">${r.agotados.length} agotados</span>
        </div>
      </div>
      ${r.agotados.length === 0
        ? '<p class="empty-state">No hay productos agotados.</p>'
        : tablaRanking(r.agotados, 'totalRecuperado', 'Recuperado')}
    </div>
  `;
}
function tablaRanking(lista, campoValor, labelValor, esNumero = false) {
  if (!lista.length) return '<p class="empty-state">Sin datos suficientes.</p>';
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Producto</th><th>SKU</th><th>Stock</th><th>${labelValor}</th><th></th></tr></thead>
        <tbody>
          ${lista.map((p, i) => `
            <tr>
              <td class="rank">${i + 1}</td>
              <td>
                <div class="cell-producto">
                  ${imagenProducto(p.imagen, p.nombre, 32)}
                  <span>${p.nombre}</span>
                </div>
              </td>
              <td><code class="sku">${p.sku}</code></td>
              <td>${p.stockActual}</td>
              <td class="fw600">${esNumero ? p[campoValor] : fmt.cop(p[campoValor])}</td>
              <td><button class="btn-link" onclick="navigate('detalle-producto','${p.id}')">Ver →</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function switchTab(btn, tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active'); t.style.display = 'none'; });
  btn.classList.add('active');
  const el = document.getElementById(tabId);
  el.style.display = '';
  el.classList.add('active');
}

// ─── MODAL PRODUCTO ───────────────────────────────────────────────────────

async function openModalProducto(id = null) {
  startProgress();
  const p = id ? await getProductoById(id) : null;
  const cfg = await getConfig();
  const titulo = p ? 'Editar producto' : 'Nuevo producto';

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>${titulo}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="form-producto" onsubmit="return false">
          <div class="form-section">
            <h4>Identificación</h4>
            <div class="form-row">
              <div class="form-group">
                <label>SKU / Código *</label>
                <input type="text" name="sku" value="${p?.sku || ''}" required placeholder="AMZ-001">
              </div>
              <div class="form-group">
                <label>Nombre del producto *</label>
                <input type="text" name="nombre" value="${p?.nombre || ''}" required placeholder="Ej: Auriculares Bluetooth">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Categoría</label>
                <input type="text" name="categoria" value="${p?.categoria || ''}" placeholder="Electrónica, Ropa…">
              </div>
              <div class="form-group">
                <label>Proveedor / Fuente</label>
                <input type="text" name="proveedor" value="${p?.proveedor || ''}" placeholder="Amazon, AliExpress…">
              </div>
            </div>
            <div class="form-group">
              <label>Descripción corta</label>
              <input type="text" name="descripcion" value="${p?.descripcion || ''}" placeholder="Breve descripción del producto">
            </div>
            <div class="form-group">
              <label>Link del producto</label>
              <input type="url" name="link" value="${p?.link || ''}" placeholder="https://amazon.com/…">
            </div>
            <div class="form-group">
              <label>URL de imagen</label>
              <input type="text" id="campo-imagen" name="imagen" value="${p?.imagen || ''}" placeholder="https://… o pega una imagen en base64">
              <small>Puedes pegar un URL de imagen o base64</small>
            </div>
            <div class="form-group">
              <label>Ubicación en bodega</label>
              <input type="text" name="ubicacion" value="${p?.ubicacion || ''}"
                placeholder="Ej: Piso 2, Estante 3, Sección A">
              <small>Indica dónde está físicamente el producto</small>
            </div>
          </div>

          <div class="form-section">
            <h4>Costos e inversión</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Precio de compra (USD) *</label>
                <input type="number" name="precioUSD" value="${p?.precioUSD || ''}" step="0.01" min="0" required oninput="calcularInversionForm()">
              </div>
              <div class="form-group">
                <label>Tasa del dólar (COP) *</label>
                <input type="number" name="tasaDolar" value="${p?.tasaDolar || cfg.tasaDolar}" min="0" required oninput="calcularInversionForm()">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Cantidad comprada *</label>
                <input type="number" name="cantidad" value="${p?.cantidad || ''}" min="1" required oninput="calcularInversionForm()">
              </div>
              <div class="form-group">
                <label>Envío internacional (COP)</label>
                <input type="number" name="envio" value="${p?.envio || 0}" min="0" oninput="calcularInversionForm()">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Otros costos (COP)</label>
                <input type="number" name="otrosCostos" value="${p?.otrosCostos || 0}" min="0" oninput="calcularInversionForm()">
              </div>
              <div class="form-group">
                <label>Precio sugerido de venta (COP)</label>
                <input type="number" name="precioSugerido" value="${p?.precioSugerido || ''}" min="0">
              </div>
            </div>
            <div class="inversion-preview" id="inversion-preview">
              <div>Inversión total: <strong id="prev-total">—</strong></div>
              <div>Costo unitario: <strong id="prev-unitario">—</strong></div>
            </div>
          </div>

          <div class="form-section">
            <h4>Estado</h4>
            <div class="form-group">
              <label>Estado del producto</label>
              <select name="estado">
                <option value="activo" ${p?.estado === 'activo' ? 'selected' : ''}>Activo</option>
                <option value="pausado" ${p?.estado === 'pausado' ? 'selected' : ''}>Pausado</option>
                <option value="agotado" ${p?.estado === 'agotado' ? 'selected' : ''}>Agotado</option>
              </select>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarProducto('${id || ''}')">
          ${p ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </div>
  `;
  openModalAnimate();
  if (p) setTimeout(calcularInversionForm, 50);
  doneProgress();
}

function calcularInversionForm() {
  const f = document.getElementById('form-producto');
  if (!f) return;
  const d = Object.fromEntries(new FormData(f));
  const usd = parseFloat(d.precioUSD) || 0;
  const tasa = parseFloat(d.tasaDolar) || 0;
  const cant = parseFloat(d.cantidad) || 0;
  const envio = parseFloat(d.envio) || 0;
  const otros = parseFloat(d.otrosCostos) || 0;
  const inv = (usd * tasa * cant) + envio + otros;
  const unit = cant > 0 ? inv / cant : 0;
  const el1 = document.getElementById('prev-total');
  const el2 = document.getElementById('prev-unitario');
  if (el1) el1.textContent = fmt.cop(inv);
  if (el2) el2.textContent = fmt.cop(unit);
}

// ─── MODAL VENTA (con cliente + teléfono obligatorios) ────────────────────

async function openModalVenta(productoId) {
  startProgress();
  const p = await getProductoEnriquecido(productoId);
  if (!p) return;

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Registrar venta</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="venta-producto-info">
          ${imagenProducto(p.imagen, p.nombre, 48)}
          <div>
            <div class="fw600">${p.nombre}</div>
            <div class="small-text text-muted">Stock disponible: <strong>${p.stockActual}</strong> unidades</div>
            <div class="small-text text-muted">Precio sugerido: ${fmt.cop(p.precioSugerido)}</div>
          </div>
        </div>
        <form id="form-venta" onsubmit="return false">
          <input type="hidden" name="productoId" value="${p.id}">
          <div class="form-row">
            <div class="form-group">
              <label>ID de venta</label>
              <input type="text" name="ventaId" placeholder="Auto: V-0001 (opcional)">
            </div>
            <div class="form-group">
              <label>Fecha de venta *</label>
              <input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del cliente</label>
              <input type="text" name="cliente" placeholder="Nombre completo">
            </div>
            <div class="form-group">
              <label>Teléfono del cliente</label>
              <input type="tel" name="telefono" placeholder="Ej: 3001234567">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Cantidad *</label>
              <input type="number" name="cantidad" min="1" max="${p.stockActual}" required placeholder="Ej: 2">
            </div>
          </div>
          <div class="form-group">
            <label>Precio de venta unitario (COP) *</label>
            <input type="number" name="precioUnitario" min="1" required placeholder="${p.precioSugerido || 'Ej: 180000'}">
          </div>
          <div class="form-group">
            <label>Observación</label>
            <input type="text" name="obs" placeholder="Notas opcionales">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarVenta()">Registrar venta</button>
      </div>
    </div>
  `;
  openModalAnimate();
  doneProgress();
}


function openModalAlertas() {
  startProgress();
  const lista = window._productosStockBajo || [];
  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Alertas de stock (${lista.length})</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert-list">
          ${lista.map(p => `
            <div class="alert-item ${p.estadoStock}"
                 onclick="closeModal(); navigate('detalle-producto','${p.id}')">
              ${imagenProducto(p.imagen, p.nombre, 36)}
              <div>
                <div class="fw600">${p.nombre}</div>
                <div class="small-text">Stock: <strong>${p.stockActual} uds.</strong> ${badge(p.estadoStock)}</div>
                ${p.ubicacion ? `<div class="small-text text-muted">📦 ${p.ubicacion}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `;
  openModalAnimate();
  doneProgress();
}

// ─── MODAL EDITAR VENTA ──────────────────────────────────────────────────

async function openModalEditarVenta(ventaId, productoId) {
  startProgress();
  const p = await getProductoEnriquecido(productoId);
  if (!p) return;

  const venta = p.ventas.find(v => v.id === ventaId);
  if (!venta) { mostrarAlerta('Venta no encontrada.', 'error'); return; }

  // Stock disponible = stock actual + la cantidad de esta venta (porque al editar se "devuelve")
  const stockDisponible = p.stockActual + venta.cantidad;

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Editar venta <code class="sku">${venta.ventaId || '—'}</code></h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="venta-producto-info">
          ${imagenProducto(p.imagen, p.nombre, 48)}
          <div>
            <div class="fw600">${p.nombre}</div>
            <div class="small-text text-muted">Stock disponible: <strong>${stockDisponible}</strong> unidades</div>
            <div class="small-text text-muted">Precio sugerido: ${fmt.cop(p.precioSugerido)}</div>
          </div>
        </div>
        <form id="form-editar-venta" onsubmit="return false">
          <input type="hidden" name="ventaId" value="${ventaId}">
          <input type="hidden" name="productoId" value="${productoId}">
          <input type="hidden" name="stockDisponible" value="${stockDisponible}">
          <div class="form-row">
            <div class="form-group">
              <label>ID de venta</label>
              <input type="text" name="ventaIdLegible" value="${venta.ventaId || ''}" placeholder="Ej: V-0001">
            </div>
            <div class="form-group">
              <label>Fecha de venta *</label>
              <input type="date" name="fecha" value="${venta.fecha || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Nombre del cliente</label>
              <input type="text" name="cliente" placeholder="Nombre completo" value="${venta.cliente || ''}">
            </div>
            <div class="form-group">
              <label>Teléfono del cliente</label>
              <input type="tel" name="telefono" placeholder="Ej: 3001234567" value="${venta.telefono || ''}">
            </div>
          </div>
            <div class="form-group">
              <label>Cantidad *</label>
              <input type="number" name="cantidad" min="1" max="${stockDisponible}" required value="${venta.cantidad || ''}">
            </div>
          <div class="form-group">
            <label>Precio de venta unitario (COP) *</label>
            <input type="number" name="precioUnitario" min="1" required value="${venta.precioUnitario || ''}">
          </div>
          <div class="form-group">
            <label>Observación</label>
            <input type="text" name="obs" placeholder="Notas opcionales" value="${venta.obs || ''}">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarEdicionVenta()">Guardar cambios</button>
      </div>
    </div>
  `;
  openModalAnimate();
  doneProgress();
}

// ─── MODAL REPONER STOCK ──────────────────────────────────────────────────

async function openModalReponerStock(productoId) {
  startProgress();
  const p = await getProductoById(productoId);
  if (!p) return;

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Reponer stock</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="venta-producto-info">
          ${imagenProducto(p.imagen, p.nombre, 48)}
          <div>
            <div class="fw600">${p.nombre}</div>
            <div class="small-text text-muted">Stock actual registrado: <strong>${p.cantidad}</strong> unidades compradas</div>
            <div class="small-text text-muted">Costo anterior: ${fmt.cop(p.precioUSD * p.tasaDolar)}/ud</div>
          </div>
        </div>

        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin:12px 0;font-size:.85rem;color:#0369a1;">
          Ingresa los datos del <strong>nuevo lote</strong>. Se sumarán al stock existente y se calculará el nuevo costo promedio.
        </div>

        <form id="form-reposicion" onsubmit="return false">
          <input type="hidden" name="productoId" value="${p.id}">
          <div class="form-row">
            <div class="form-group">
              <label>Unidades nuevas a agregar *</label>
              <input type="number" name="cantidadNueva" min="1" required placeholder="Ej: 10" oninput="calcularReposicion()">
            </div>
            <div class="form-group">
              <label>Precio de compra (USD) *</label>
              <input type="number" name="precioUSDNuevo" step="0.01" min="0" value="${p.precioUSD}" required oninput="calcularReposicion()">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tasa del dólar (COP) *</label>
              <input type="number" name="tasaDolarNuevo" min="0" value="${p.tasaDolar}" required oninput="calcularReposicion()">
            </div>
            <div class="form-group">
              <label>Envío del nuevo lote (COP)</label>
              <input type="number" name="envioNuevo" min="0" value="0" oninput="calcularReposicion()">
            </div>
          </div>
          <div class="form-group">
            <label>Otros costos del nuevo lote (COP)</label>
            <input type="number" name="otrosCostosNuevo" min="0" value="0" oninput="calcularReposicion()">
          </div>

          <div class="inversion-preview" id="preview-reposicion" style="margin-top:12px">
            <div>Inversión nuevo lote: <strong id="rep-inversion-lote">—</strong></div>
            <div>Nuevo total de stock: <strong id="rep-stock-total">—</strong></div>
            <div>Nueva inversión total: <strong id="rep-inversion-total">—</strong></div>
            <div>Nuevo costo unitario promedio: <strong id="rep-costo-unitario">—</strong></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarReposicion('${p.id}')">Agregar stock</button>
      </div>
    </div>
  `;
  openModalAnimate();
  window._productoReposicion = p;
  setTimeout(calcularReposicion, 50);
  doneProgress();
}

function calcularReposicion() {
  const f = document.getElementById('form-reposicion');
  if (!f || !window._productoReposicion) return;
  const p = window._productoReposicion;
  const d = Object.fromEntries(new FormData(f));

  const cantNueva = parseFloat(d.cantidadNueva) || 0;
  const usdNuevo = parseFloat(d.precioUSDNuevo) || 0;
  const tasaNueva = parseFloat(d.tasaDolarNuevo) || 0;
  const envioNuevo = parseFloat(d.envioNuevo) || 0;
  const otrosNuevo = parseFloat(d.otrosCostosNuevo) || 0;

  const invNuevoLote = (usdNuevo * tasaNueva * cantNueva) + envioNuevo + otrosNuevo;
  const invAnterior = (p.precioUSD * p.tasaDolar * p.cantidad) + (p.envio || 0) + (p.otrosCostos || 0);
  const totalCantidad = p.cantidad + cantNueva;
  const totalInversion = invAnterior + invNuevoLote;
  const costoPromedio = totalCantidad > 0 ? totalInversion / totalCantidad : 0;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rep-inversion-lote', fmt.cop(invNuevoLote));
  set('rep-stock-total', `${fmt.num(totalCantidad)} uds`);
  set('rep-inversion-total', fmt.cop(totalInversion));
  set('rep-costo-unitario', fmt.cop(costoPromedio));
}

// ─── MODAL ELIMINAR CON CÓDIGO 2356 ──────────────────────────────────────

function openModalEliminar(id) {
  startProgress();
  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Confirmar eliminación</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p class="delete-confirm-msg">
          Para eliminar este producto y todas sus ventas, ingresa el código de seguridad:
        </p>
        <input type="text" id="delete-code-input" class="delete-confirm-input"
               placeholder="Código" maxlength="4" autocomplete="off">
        <p style="text-align:center;margin-top:10px;font-size:.78rem;color:var(--text-light)">
          Esta acción no se puede deshacer.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" style="background:var(--red)" onclick="ejecutarEliminar('${id}')">Eliminar</button>
      </div>
    </div>
  `;
  openModalAnimate();
  setTimeout(() => document.getElementById('delete-code-input')?.focus(), 100);
  doneProgress();
}

// ─── MODAL DESCARGA REPORTE ──────────────────────────────────────────────

async function openModalReporte() {
  startProgress();
  const r = await getReportes();
  const meses = r.meses || [];

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-reporte">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="modal-header-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <h2>Generar reporte</h2>
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">

        <!-- Formato -->
        <div class="rep-config-row">
          <div class="rep-config-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Formato
          </div>
          <div class="reporte-formato-btns">
            <button class="reporte-fmt-btn active" id="fmt-excel" onclick="seleccionarFormato('excel')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
              Excel
            </button>
            <button class="reporte-fmt-btn" id="fmt-pdf" onclick="seleccionarFormato('pdf')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>
              PDF
            </button>
            <button class="reporte-fmt-btn" id="fmt-csv" onclick="seleccionarFormato('csv')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              CSV
            </button>
          </div>
        </div>

        <!-- Mes -->
        <div class="rep-config-row">
          <div class="rep-config-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Periodo
          </div>
          <select id="rep-mes-select" class="select-mes" style="flex:1;max-width:220px">
            <option value="">Todos los meses</option>
            ${meses.map(m => `<option value="${m.mes}">${formatearMesLabel(m.mes)}</option>`).join('')}
          </select>
        </div>

        <div class="rep-divider"></div>

        <!-- Reporte general con checkboxes -->
        <div class="reporte-seccion-bloque">
          <div class="reporte-seccion-header">
            <div class="reporte-seccion-info">
              <div class="opt-title">Reporte general personalizado</div>
              <div class="opt-desc">Elige qué secciones incluir</div>
            </div>
            <span class="reporte-opt-badge-inline">Recomendado</span>
          </div>

          <div class="rep-checks-grid">
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="inventario" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  Inventario
                </div>
                <div class="rep-check-desc">Productos y costos</div>
              </div>
            </label>
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="ventas" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                  Historial ventas
                </div>
                <div class="rep-check-desc">Todas las ventas</div>
              </div>
            </label>
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="meses" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Resumen mensual
                </div>
                <div class="rep-check-desc">Ganancias por mes</div>
              </div>
            </label>
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="stock" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
                  Estado stock
                </div>
                <div class="rep-check-desc">Stock y alertas</div>
              </div>
            </label>
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="resumen" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  Resumen financiero
                </div>
                <div class="rep-check-desc">Inversion vs ganancia</div>
              </div>
            </label>
            <label class="rep-check-label">
              <input type="checkbox" class="rep-check" value="totales" checked>
              <span class="rep-check-box"></span>
              <div>
                <div class="rep-check-title">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Totales generales
                </div>
                <div class="rep-check-desc">Sumas globales</div>
              </div>
            </label>
          </div>

          <button class="btn-primary rep-descargar-btn" onclick="descargarReporte('general')">
            ${ICONS.download} Generar reporte general
          </button>
        </div>

        <!-- Reportes individuales -->
        <div class="reporte-individuales-titulo">O descarga solo una seccion:</div>
        <div class="reporte-grid-2">
          <div class="reporte-opt-mini" onclick="descargarReporte('inventario')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            Inventario
          </div>
          <div class="reporte-opt-mini" onclick="descargarReporte('ventas')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Historial de ventas
          </div>
          <div class="reporte-opt-mini" onclick="descargarReporte('meses')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Resumen mensual
          </div>
          <div class="reporte-opt-mini" onclick="descargarReporte('stock')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Estado del stock
          </div>
          <div class="reporte-opt-mini" onclick="descargarReporte('resumen')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Resumen financiero
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `;
  window._reporteFormato = 'excel';
  openModalAnimate();
  doneProgress();
}

function seleccionarFormato(fmt) {
  window._reporteFormato = fmt;
  document.querySelectorAll('.reporte-fmt-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('fmt-' + fmt)?.classList.add('active');
}

// ─── VISTA FIREBASE ────────────────────────────────────────────────────────

async function renderConfiguracion() {
  startProgress();
  const cfg = await getConfig();
  const conectado = !!cfg.firebaseConectado;

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <div>
        <h1>Configuración</h1>
        <span class="subtitle">Personalización y ajustes del sistema</span>
      </div>
    </div>

    <!-- Apariencia -->
    <div class="config-seccion">
      <div class="config-seccion-header">
        <div class="config-seccion-icon config-icon-apariencia">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div>
          <h3>Apariencia</h3>
          <p>Logo e identidad visual de la app</p>
        </div>
      </div>

      <div class="config-item">
        <div class="config-item-info">
          <div class="config-item-label">Logo de la aplicación</div>
          <div class="config-item-desc">Se muestra en la esquina superior derecha. Formatos: PNG, JPG, SVG.</div>
        </div>
        <div class="config-logo-preview">
          ${cfg.logoDataUrl
            ? `<img id="cfg-logo-preview" src="${cfg.logoDataUrl}" alt="Logo actual" class="cfg-logo-img">`
            : `<div id="cfg-logo-preview" class="cfg-logo-placeholder">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Sin logo
              </div>`}
          <div class="cfg-logo-btns">
            <button class="btn-primary cfg-btn-sm" onclick="document.getElementById('logo-file-input').click()">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              ${cfg.logoDataUrl ? 'Cambiar logo' : 'Subir logo'}
            </button>
            ${cfg.logoDataUrl ? `<button class="btn-secondary cfg-btn-sm" onclick="eliminarLogo()">Eliminar</button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Firebase -->
    <div class="config-seccion">
      <div class="config-seccion-header">
        <div class="config-seccion-icon config-icon-firebase">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div>
          <h3>Firebase / Base de datos</h3>
          <p>Estado de la sincronización en la nube</p>
        </div>
      </div>

      <div class="config-item">
        <div class="config-item-info">
          <div class="config-item-label">Estado de sincronización</div>
          <div class="config-item-desc">Los datos se guardan en Firebase Firestore y se sincronizan entre dispositivos en tiempo real.</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="firebase-status ${conectado ? 'on' : 'off'}">
            <span class="firebase-dot"></span>
            ${conectado ? 'Conectado' : 'Sin conectar'}
          </span>
          <button class="btn-secondary cfg-btn-sm" onclick="marcarFirebaseConectado()">
            Marcar conectado
          </button>
        </div>
      </div>
    </div>

    <!-- Acerca de -->
    <div class="config-seccion">
      <div class="config-seccion-header">
        <div class="config-seccion-icon config-icon-info">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <h3>Acerca de</h3>
          <p>Información de la aplicación</p>
        </div>
      </div>
      <div class="config-item">
        <div class="config-item-info">
          <div class="config-item-label">Centris Inversiones</div>
          <div class="config-item-desc">Control de inversiones, ventas e inventario. Versión 2.3</div>
        </div>
      </div>
    </div>
  `;
  doneProgress();
}

async function eliminarLogo() {
  try {
    const cfg = await getConfig();
    await saveConfig({ ...cfg, logoDataUrl: null });
    const img = document.getElementById('header-logo-img');
    const fallback = document.getElementById('header-avatar-fallback');
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (fallback) fallback.style.display = 'flex';
    mostrarAlerta('Logo eliminado.', 'success');
    await renderConfiguracion();
  } catch(e) {
    mostrarAlerta('Error al eliminar el logo.', 'error');
  }
}

async function renderFirebase() {
  navigate('configuracion');
}

function openModalAnimate() {

  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'flex';
  // Trigger reflow so transition starts from initial state
  overlay.getBoundingClientRect();
  overlay.classList.remove('modal-closing');
  overlay.classList.add('modal-entering');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const modal = overlay.querySelector('.modal');

  overlay.classList.remove('modal-entering');
  overlay.classList.add('modal-closing');
  if (modal) modal.classList.add('modal-out');

  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('modal-closing');
    overlay.innerHTML = '';
    window._productoReposicion = null;
  }, 220);
}