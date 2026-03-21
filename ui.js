/**
 * UI.JS — Renderizado de vistas
 * Cada función genera el HTML de una sección y lo inyecta en el contenedor principal.
 */

// ─── UTILIDADES UI ────────────────────────────────────────────────────────────

const fmt = {
  cop: (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0),
  usd: (n) => `$${(n || 0).toFixed(2)}`,
  num: (n) => new Intl.NumberFormat('es-CO').format(n || 0),
  pct: (n) => `${(n || 0).toFixed(1)}%`,
  fecha: (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
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

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

async function renderDashboard() {
  const r = await calcularResumenGlobal();

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="subtitle">Resumen general de inversiones</span>
      <button class="btn-download" onclick="openModalReporte()">
        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Descargar reporte
      </button>
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
          <h3>Últimas ventas</h3>
          <button class="btn-link" onclick="navigate('productos')">Ver productos</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Fecha</th><th>Cant.</th><th>Precio unit.</th><th>Total</th></tr></thead>
            <tbody>
              ${r.ultimasVentas.length === 0 ? '<tr><td colspan="5" class="empty">Sin ventas aún</td></tr>' :
                r.ultimasVentas.map(v => `
                  <tr onclick="navigate('detalle-producto','${v.productoId}')" class="clickable">
                    <td>
                      <div class="cell-producto">
                        ${imagenProducto(v.producto?.imagen, v.producto?.nombre)}
                        <span>${v.producto?.nombre || '—'}</span>
                      </div>
                    </td>
                    <td>${fmt.fecha(v.fecha)}</td>
                    <td>${v.cantidad}</td>
                    <td>${fmt.cop(v.precioUnitario)}</td>
                    <td class="fw600">${fmt.cop(v.cantidad * v.precioUnitario)}</td>
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
          ? '<p class="empty-state">✓ Todo el stock está en niveles normales.</p>'
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

// ─── LISTADO PRODUCTOS ────────────────────────────────────────────────────────

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
                      <button class="btn-icon" title="Ver" onclick="navigate('detalle-producto','${p.id}')">👁</button>
                      <button class="btn-icon" title="Venta" onclick="openModalVenta('${p.id}')">💰</button>
                      <button class="btn-icon" title="Editar" onclick="openModalProducto('${p.id}')">✏️</button>
                      <button class="btn-icon btn-danger" title="Eliminar" onclick="confirmarEliminar('${p.id}')">🗑</button>
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── DETALLE PRODUCTO ─────────────────────────────────────────────────────────

async function renderDetalleProducto(id) {
  const p = await getProductoEnriquecido(id);
  if (!p) { navigate('productos'); return; }

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <button class="btn-back" onclick="navigate('productos')">← Volver</button>
      <h1>${p.nombre}</h1>
      <button class="btn-primary" onclick="openModalVenta('${p.id}')">+ Registrar venta</button>
    </div>

    <div class="detalle-grid">
      <div class="card detalle-info">
        <div class="detalle-imagen">
          ${p.imagen
            ? `<img src="${p.imagen}" alt="${p.nombre}">`
            : `<div class="img-placeholder large">${p.nombre[0].toUpperCase()}</div>`}
        </div>
        <div class="detalle-datos">
          <div class="dato-row"><span>SKU</span><code class="sku">${p.sku}</code></div>
          <div class="dato-row"><span>Categoría</span>${p.categoria || '—'}</div>
          <div class="dato-row"><span>Proveedor</span>${p.proveedor || '—'}</div>
          ${p.link ? `<div class="dato-row"><span>Link</span><a href="${p.link}" target="_blank" class="link">Ver en tienda ↗</a></div>` : ''}
          <div class="dato-row"><span>Estado</span>${badge(p.estado)}</div>
          ${p.descripcion ? `<div class="dato-row"><span>Descripción</span><em>${p.descripcion}</em></div>` : ''}
        </div>
        <div class="detalle-acciones">
          <button class="btn-secondary" onclick="openModalProducto('${p.id}')">✏️ Editar producto</button>
        </div>
      </div>

      <div class="metricas-col">
        <div class="metrica-card blue">
          <div class="metrica-label">Inversión total</div>
          <div class="metrica-valor">${fmt.cop(p.inversionTotal)}</div>
          <div class="metrica-sub">${fmt.usd(p.precioUSD)}/ud × ${fmt.num(p.tasaDolar)} + envío y costos</div>
        </div>
        <div class="metrica-card slate">
          <div class="metrica-label">Costo unitario</div>
          <div class="metrica-valor">${fmt.cop(p.costoUnitario)}</div>
          <div class="metrica-sub">Precio sugerido: ${fmt.cop(p.precioSugerido)}</div>
        </div>
        <div class="metrica-card green">
          <div class="metrica-label">Total recuperado</div>
          <div class="metrica-valor">${fmt.cop(p.totalRecuperado)}</div>
          <div class="metrica-sub">${fmt.pct(p.recuperacionPct)} de la inversión</div>
        </div>
        <div class="metrica-card ${p.ganancia >= 0 ? 'teal' : 'red'}">
          <div class="metrica-label">Ganancia acumulada</div>
          <div class="metrica-valor">${fmt.cop(p.ganancia)}</div>
          <div class="metrica-sub">${p.unidadesVendidas} uds vendidas de ${p.cantidad}</div>
        </div>
        <div class="metrica-card orange">
          <div class="metrica-label">Stock actual</div>
          <div class="metrica-valor">${fmt.num(p.stockActual)} uds</div>
          <div class="metrica-sub">${badge(p.estadoStock)}</div>
        </div>
      </div>
    </div>

    <div class="card mt20">
      <div class="card-header">
        <h3>Historial de ventas</h3>
        <span class="text-muted small-text">${p.ventas.length} registros</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th><th>Cliente</th><th>Observación</th><th></th></tr>
          </thead>
          <tbody>
            ${p.ventas.length === 0
              ? '<tr><td colspan="7" class="empty">Sin ventas registradas</td></tr>'
              : [...p.ventas].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(v => `
                <tr>
                  <td>${fmt.fecha(v.fecha)}</td>
                  <td>${v.cantidad}</td>
                  <td>${fmt.cop(v.precioUnitario)}</td>
                  <td class="fw600">${fmt.cop(v.cantidad * v.precioUnitario)}</td>
                  <td>${v.cliente || '—'}</td>
                  <td class="text-muted">${v.obs || '—'}</td>
                  <td><button class="btn-icon btn-danger" onclick="eliminarVenta('${v.id}','${p.id}')" title="Eliminar">🗑</button></td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── REPORTES ─────────────────────────────────────────────────────────────────

async function renderReportes() {
  const r = await getReportes();

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>Reportes</h1>
      <span class="subtitle">Análisis de inversiones y ventas</span>
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
      ${tablaRanking(r.menosMovimiento, 'numVentas', 'Nº ventas', true)}
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
          <thead><tr><th>Mes</th><th>Nº ventas</th><th>Unidades</th><th>Total ingresado</th></tr></thead>
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

// ─── MODAL PRODUCTO ───────────────────────────────────────────────────────────

async function openModalProducto(id = null) {
  const p = id ? await getProductoById(id) : null;
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
                <input type="number" name="tasaDolar" value="${p?.tasaDolar || getConfig().tasaDolar}" min="0" required oninput="calcularInversionForm()">
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
  document.getElementById('modal-overlay').style.display = 'flex';
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

// ─── MODAL VENTA ──────────────────────────────────────────────────────────────

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
          <div class="form-row">
            <div class="form-group">
              <label>Cliente / Referencia</label>
              <input type="text" name="cliente" placeholder="Nombre o referencia opcional">
            </div>
            <div class="form-group">
              <label>Observación</label>
              <input type="text" name="obs" placeholder="Notas opcionales">
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" onclick="guardarVenta()">Registrar venta</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-overlay').innerHTML = '';
}

// ─── MODAL DESCARGA REPORTE ───────────────────────────────────────────────────

function openModalReporte() {
  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>📥 Descargar reporte</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:16px">
          Elige el reporte que deseas descargar en formato CSV (compatible con Excel).
        </p>
        <div class="reporte-opciones">
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
  document.getElementById('modal-overlay').style.display = 'flex';
}

// ─── VISTA FIREBASE ────────────────────────────────────────────────────────────

function renderFirebase() {
  const cfg = getConfig();
  const conectado = !!cfg.firebaseConectado;

  document.querySelector('#main-content').innerHTML = `
    <div class="page-header">
      <h1>🔥 Conexión Firebase</h1>
      <span class="firebase-status ${conectado ? 'on' : 'off'}">
        ${conectado ? '● Conectado' : '● Sin conectar'}
      </span>
    </div>

    <div class="firebase-panel">
      <h3>🔥 ¿Por qué conectar Firebase?</h3>
      <p>Actualmente los datos se guardan solo en este navegador (localStorage). Con Firebase, los datos quedan en la nube, se sincronizan entre dispositivos y no se pierden si borras el navegador.</p>
    </div>

    <div class="card" style="padding:28px;max-width:720px">
      <h3 style="margin-bottom:20px;font-size:1rem">Pasos para conectar Firebase</h3>
      <ol class="firebase-steps">
        <li>
          Ve a <strong>console.firebase.google.com</strong>, crea un proyecto nuevo (ej: <code>centris-inversiones</code>)
        </li>
        <li>
          En el proyecto, haz clic en <strong>"Agregar app web"</strong> (icono &lt;/&gt;) y copia la configuración que te da Firebase
        </li>
        <li>
          En tu proyecto, abre <code>index.html</code> y antes de los scripts agrega:
          <pre style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-top:8px;font-family:monospace;font-size:.78rem;overflow-x:auto">&lt;script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"&gt;&lt;/script&gt;
&lt;script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"&gt;&lt;/script&gt;
&lt;script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js"&gt;&lt;/script&gt;
&lt;script src="firebase-config.js"&gt;&lt;/script&gt;</pre>
        </li>
        <li>
          Crea un archivo <code>firebase-config.js</code> con tu configuracion:
          <pre style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-top:8px;font-family:monospace;font-size:.78rem;overflow-x:auto">const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_ID",
  appId: "TU_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();</pre>
        </li>
        <li>
          En Firestore, activa la base de datos en modo <strong>prueba</strong> (permite leer/escribir sin login por 30 dias)
        </li>
        <li>
          Reemplaza el archivo <code>storage.js</code> con la version Firebase. Las colecciones que usara la app: <code>productos</code>, <code>ventas</code> y <code>config</code>
        </li>
      </ol>

      <div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
        <div style="font-weight:600;color:#166534;margin-bottom:6px">📦 Estructura de colecciones en Firestore</div>
        <pre style="font-family:monospace;font-size:.78rem;color:#166534;line-height:1.6">firestore/
├── productos/    → { sku, nombre, precioUSD, tasaDolar, cantidad, ... }
├── ventas/       → { productoId, fecha, cantidad, precioUnitario, ... }
└── config/
    └── global    → { tasaDolar, moneda }</pre>
      </div>

      <div style="margin-top:16px;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px">
        <div style="font-weight:600;color:#c2410c;margin-bottom:6px">⚠️ Importante al migrar</div>
        <p style="font-size:.85rem;color:#9a3412">
          Las funciones de <code>storage.js</code> son sincronas ahora. Con Firebase seran <strong>async/await</strong>.
          Solo necesitas agregar <code>async</code> a las funciones en <code>app.js</code> que llaman datos y usar <code>await</code> antes de cada llamada.
          El resto de <code>ui.js</code> y <code>productos.js</code> no necesita cambios.
        </p>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button class="btn-primary" onclick="marcarFirebaseConectado()">Marcar como conectado</button>
        <button class="btn-secondary" onclick="navigate('dashboard')">Volver al dashboard</button>
      </div>
    </div>
  `;
}