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

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="subtitle">Resumen general de inversiones</span>
    </div>

    <div class="kpi-grid">
      ${kpiCard('Total Invertido', fmt.cop(r.totalInvertido), 'invest', 'kpi-blue')}
      ${kpiCard('Total Recuperado', fmt.cop(r.totalRecuperado), 'recover', 'kpi-green')}
      ${kpiCard('Ganancia Estimada', fmt.cop(r.gananciaTotal), 'profit', r.gananciaTotal >= 0 ? 'kpi-teal' : 'kpi-red')}
      ${kpiCard('Productos', r.totalProductos, 'box', 'kpi-purple')}
      ${kpiCard('Unidades en Stock', fmt.num(r.unidadesTotalesStock), 'stock', 'kpi-orange')}
      ${kpiCard('Unidades Vendidas', fmt.num(r.unidadesTotalesVendidas), 'sold', 'kpi-slate')}
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header">
          <h3>Ultimas ventas</h3>
          <button class="btn-link" onclick="navigate('productos')">Ver productos</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID Venta</th><th>Producto</th><th>Fecha</th><th>Cliente</th><th>Teléfono</th><th>Cant.</th><th>Precio venta</th><th>Ganancia</th></tr></thead>
            <tbody>
              ${r.ultimasVentas.length === 0 ? '<tr><td colspan="8" class="empty">Sin ventas aún</td></tr>' :
                r.ultimasVentas.map(v => `
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
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Alertas de stock</h3>
        </div>
        ${r.productosStockBajo.length === 0
          ? '<p class="empty-state">Todo el stock está en niveles normales.</p>'
          : `<div class="alert-list">
              ${r.productosStockBajo.map(p => `
                <div class="alert-item ${p.estadoStock}" onclick="navigate('detalle-producto','${p.id}')">
                  ${imagenProducto(p.imagen, p.nombre, 36)}
                  <div>
                    <div class="fw600">${p.nombre}</div>
                    <div class="small-text">Stock: ${p.stockActual} uds. ${badge(p.estadoStock)}</div>
                  </div>
                </div>`).join('')}
            </div>`}
      </div>
    </div>
  `;
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
                <tr>
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
                    <div class="action-btns">
                      ${btnIcon('eye', 'Ver', `navigate('detalle-producto','${p.id}')`)}
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

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Reportes</h1>
      <span class="subtitle">Análisis de inversiones y ventas</span>
      <button class="btn-download" onclick="openModalReporte()">
        ${ICONS.download}
        Descargar reporte
      </button>
    </div>

    <div class="reportes-tabs">
      <button class="tab active" onclick="switchTab(this,'rep-inversion')">Mayor inversión</button>
      <button class="tab" onclick="switchTab(this,'rep-ganancia')">Mayor ganancia</button>
      <button class="tab" onclick="switchTab(this,'rep-movimiento')">Menos movimiento</button>
      <button class="tab" onclick="switchTab(this,'rep-categorias')">Por categoría</button>
      <button class="tab" onclick="switchTab(this,'rep-meses')">Por mes</button>
      <button class="tab" onclick="switchTab(this,'rep-agotados')">Agotados</button>
    </div>

    <div id="rep-inversion" class="tab-content active card">
      <h3 class="reporte-titulo">Productos con mayor inversión</h3>
      ${tablaRanking(r.mayorInversion, 'inversionTotal', 'Inversión')}
    </div>

    <div id="rep-ganancia" class="tab-content card" style="display:none">
      <h3 class="reporte-titulo">Productos con mayor ganancia</h3>
      ${tablaRanking(r.mayorGanancia, 'ganancia', 'Ganancia')}
    </div>

    <div id="rep-movimiento" class="tab-content card" style="display:none">
      <h3 class="reporte-titulo">Productos con menos movimiento</h3>
      ${tablaRanking(r.menosMovimiento, 'numVentas', 'N° ventas', true)}
    </div>

    <div id="rep-categorias" class="tab-content card" style="display:none">
      <h3 class="reporte-titulo">Resumen por categoría</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Categoría</th><th>Productos</th><th>Inversión</th><th>Recuperado</th><th>Ganancia</th></tr></thead>
          <tbody>
            ${r.categorias.map(c => `
              <tr>
                <td class="fw600">${c.nombre}</td>
                <td>${c.productos}</td>
                <td>${fmt.cop(c.inversion)}</td>
                <td>${fmt.cop(c.recuperado)}</td>
                <td class="${c.ganancia >= 0 ? 'text-success' : 'text-danger'}">${fmt.cop(c.ganancia)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="rep-meses" class="tab-content card" style="display:none">
      <h3 class="reporte-titulo">Resumen mensual de ventas</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mes</th><th>N° ventas</th><th>Unidades</th><th>Total ingresado</th></tr></thead>
          <tbody>
            ${r.meses.length === 0
              ? '<tr><td colspan="4" class="empty">Sin ventas registradas</td></tr>'
              : r.meses.map(m => `
                <tr>
                  <td class="fw600">${m.mes}</td>
                  <td>${m.numVentas}</td>
                  <td>${m.unidades}</td>
                  <td>${fmt.cop(m.total)}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="rep-agotados" class="tab-content card" style="display:none">
      <h3 class="reporte-titulo">Productos agotados (${r.agotados.length})</h3>
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
              <label>Fecha de venta *</label>
              <input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
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
}

// ─── MODAL EDITAR VENTA ──────────────────────────────────────────────────

async function openModalEditarVenta(ventaId, productoId) {
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
}

// ─── MODAL REPONER STOCK ──────────────────────────────────────────────────

async function openModalReponerStock(productoId) {
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
}

// ─── MODAL DESCARGA REPORTE ──────────────────────────────────────────────

function openModalReporte() {
  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Descargar reporte</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:16px">
          Elige el reporte que deseas descargar en formato CSV (compatible con Excel).
        </p>
        <div class="reporte-opciones">
          <div class="reporte-opt reporte-opt-destacado" onclick="descargarReporte('general')">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <div class="opt-title">Reporte general completo</div>
            <div class="opt-desc">Todo en un solo archivo: inventario, ventas, stock y resumen financiero</div>
          </div>
          <div class="reporte-opt" onclick="descargarReporte('inventario')">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <div class="opt-title">Inventario completo</div>
            <div class="opt-desc">Todos los productos con inversión, stock y ganancias</div>
          </div>
          <div class="reporte-opt" onclick="descargarReporte('ventas')">
            <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <div class="opt-title">Historial de ventas</div>
            <div class="opt-desc">Todas las ventas registradas con fechas y precios</div>
          </div>
          <div class="reporte-opt" onclick="descargarReporte('stock')">
            <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <div class="opt-title">Estado del stock</div>
            <div class="opt-desc">Stock actual, agotados y productos en alerta</div>
          </div>
          <div class="reporte-opt" onclick="descargarReporte('resumen')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <div class="opt-title">Resumen financiero</div>
            <div class="opt-desc">Inversión vs recuperación vs ganancia por producto</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>
  `;
  openModalAnimate();
}

// ─── VISTA FIREBASE ────────────────────────────────────────────────────────

async function renderFirebase() {
  const cfg = await getConfig();
  const conectado = !!cfg.firebaseConectado;

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Firebase</h1>
      <span class="firebase-status ${conectado ? 'on' : 'off'}">
        ${conectado ? 'Conectado' : 'Sin conectar'}
      </span>
    </div>

    <div class="firebase-panel">
      <h3>Sincronización en la nube activa</h3>
      <p>Los datos se guardan en Firebase Firestore y se sincronizan entre todos tus dispositivos en tiempo real.</p>
    </div>

    <div style="margin-top:20px;display:flex;gap:10px">
      <button class="btn-primary" onclick="marcarFirebaseConectado()">Marcar como conectado</button>
      <button class="btn-secondary" onclick="navigate('dashboard')">Volver al dashboard</button>
    </div>
  `;
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