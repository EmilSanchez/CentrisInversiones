/**
 * APP.JS — Inicialización, router y acciones globales
 * Controla la navegación entre secciones y los eventos de los formularios.
 */

// ─── ESTADO DE LA APP ─────────────────────────────────────────────────────────

const appState = {
  vistaActual: 'dashboard',
  detalleProductoId: null,
  filtrosProductos: {},
};

// ─── ROUTER ───────────────────────────────────────────────────────────────────

/**
 * Navega a una sección de la app.
 * @param {string} vista - Nombre de la vista
 * @param {string} [param] - Parámetro opcional (ej: id de producto)
 */
function navigate(vista, param = null) {
  appState.vistaActual = vista;
  appState.detalleProductoId = param;

  // Actualizar sidebar activo
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.vista === vista.split('-')[0]);
  });

  // Renderizar vista
  switch (vista) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'productos':
      renderProductos(appState.filtrosProductos);
      break;
    case 'detalle-producto':
      renderDetalleProducto(param);
      break;
    case 'reportes':
      renderReportes();
      break;
    case 'firebase':
      renderFirebase();
      break;
    default:
      renderDashboard();
  }

  // Cerrar sidebar en móvil
  document.getElementById('sidebar').classList.remove('open');
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

function aplicarFiltros() {
  appState.filtrosProductos = {
    busqueda: document.getElementById('f-busqueda')?.value || '',
    categoria: document.getElementById('f-categoria')?.value || '',
    estado: document.getElementById('f-estado')?.value || '',
    orden: document.getElementById('f-orden')?.value || '',
  };
  renderProductos(appState.filtrosProductos);
}

// ─── GUARDAR PRODUCTO ─────────────────────────────────────────────────────────

function guardarProducto(id) {
  const form = document.getElementById('form-producto');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));

  // Parsear números
  ['precioUSD', 'tasaDolar', 'cantidad', 'envio', 'otrosCostos', 'precioSugerido'].forEach(k => {
    data[k] = parseFloat(data[k]) || 0;
  });

  const errores = validarProducto(data);
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

  if (id) {
    updateProducto(id, data);
    mostrarAlerta('Producto actualizado correctamente.', 'success');
  } else {
    addProducto(data);
    mostrarAlerta('Producto creado correctamente.', 'success');
  }

  closeModal();
  navigate('productos');
}

// ─── GUARDAR VENTA ────────────────────────────────────────────────────────────

function guardarVenta() {
  const form = document.getElementById('form-venta');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.cantidad = parseInt(data.cantidad) || 0;
  data.precioUnitario = parseFloat(data.precioUnitario) || 0;

  const p = getProductoEnriquecido(data.productoId);
  if (!p) return;

  const errores = validarVenta(data, p.stockActual);
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

  addVenta(data);

  // Si stock llega a 0, actualizar estado
  const nuevo = getProductoEnriquecido(data.productoId);
  if (nuevo.stockActual === 0) {
    updateProducto(data.productoId, { estado: 'agotado' });
  }

  mostrarAlerta('Venta registrada correctamente.', 'success');
  closeModal();

  // Refrescar vista actual
  if (appState.vistaActual === 'detalle-producto') {
    renderDetalleProducto(data.productoId);
  } else {
    navigate('productos');
  }
}

// ─── ELIMINAR PRODUCTO ────────────────────────────────────────────────────────

function confirmarEliminar(id) {
  const p = getProductoById(id);
  if (!confirm(`¿Eliminar el producto "${p?.nombre}"?\nTambién se eliminarán todas sus ventas. Esta acción no se puede deshacer.`)) return;
  deleteProducto(id);
  mostrarAlerta('Producto eliminado.', 'info');
  navigate('productos');
}

// ─── ELIMINAR VENTA ───────────────────────────────────────────────────────────

function eliminarVenta(ventaId, productoId) {
  if (!confirm('¿Eliminar este registro de venta?')) return;
  deleteVenta(ventaId);
  mostrarAlerta('Venta eliminada.', 'info');
  renderDetalleProducto(productoId);
}

// ─── ALERTAS ──────────────────────────────────────────────────────────────────

function mostrarAlerta(mensaje, tipo = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = mensaje;
  el.className = `toast show toast-${tipo}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  cargarDatosDemo();
  navigate('dashboard');

  // Toggle sidebar móvil
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Cerrar modal con clic en overlay
  document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);

// ─── DESCARGA DE REPORTES CSV ─────────────────────────────────────────────────

function descargarReporte(tipo) {
  let csv = '';
  let filename = '';
  const sep = ';'; // Compatible con Excel en español

  const productos = getProductosEnriquecidos();
  const ventas = getVentas();

  if (tipo === 'inventario') {
    filename = 'centris_inventario.csv';
    const headers = ['SKU','Nombre','Categoria','Proveedor','Precio USD','Tasa Dolar','Cantidad Comprada','Envio','Otros Costos','Inversion Total','Costo Unitario','Precio Sugerido','Unidades Vendidas','Stock Actual','Total Recuperado','Ganancia','Recuperacion %','Estado'];
    csv = headers.join(sep) + '\n';
    csv += productos.map(p => [
      p.sku, p.nombre, p.categoria||'', p.proveedor||'',
      p.precioUSD, p.tasaDolar, p.cantidad, p.envio||0, p.otrosCostos||0,
      Math.round(p.inversionTotal), Math.round(p.costoUnitario), p.precioSugerido||0,
      p.unidadesVendidas, p.stockActual,
      Math.round(p.totalRecuperado), Math.round(p.ganancia),
      p.recuperacionPct.toFixed(1)+'%', p.estado
    ].join(sep)).join('\n');

  } else if (tipo === 'ventas') {
    filename = 'centris_ventas.csv';
    const headers = ['Fecha','Producto','SKU','Cantidad','Precio Unitario','Total Venta','Cliente','Observacion'];
    csv = headers.join(sep) + '\n';
    const ventasOrdenadas = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    csv += ventasOrdenadas.map(v => {
      const p = getProductoById(v.productoId);
      return [
        v.fecha, p?.nombre||'Eliminado', p?.sku||'-',
        v.cantidad, v.precioUnitario,
        v.cantidad * v.precioUnitario,
        v.cliente||'', v.obs||''
      ].join(sep);
    }).join('\n');

  } else if (tipo === 'stock') {
    filename = 'centris_stock.csv';
    const headers = ['SKU','Nombre','Categoria','Cantidad Comprada','Vendidas','Stock Actual','Estado Stock','Estado Producto'];
    csv = headers.join(sep) + '\n';
    csv += productos.map(p => [
      p.sku, p.nombre, p.categoria||'',
      p.cantidad, p.unidadesVendidas, p.stockActual,
      p.estadoStock, p.estado
    ].join(sep)).join('\n');

  } else if (tipo === 'resumen') {
    filename = 'centris_resumen_financiero.csv';
    const headers = ['SKU','Nombre','Inversion Total','Total Recuperado','Ganancia','Recuperacion %','Costo Unitario','Precio Sugerido','Margen Estimado %'];
    csv = headers.join(sep) + '\n';
    csv += productos.map(p => {
      const margen = p.precioSugerido > 0 ? ((p.precioSugerido - p.costoUnitario) / p.precioSugerido * 100).toFixed(1) : '0';
      return [
        p.sku, p.nombre,
        Math.round(p.inversionTotal), Math.round(p.totalRecuperado),
        Math.round(p.ganancia), p.recuperacionPct.toFixed(1)+'%',
        Math.round(p.costoUnitario), p.precioSugerido||0, margen+'%'
      ].join(sep);
    }).join('\n');
  }

  // Agregar BOM para que Excel en Windows lo abra bien
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  closeModal();
  mostrarAlerta(`Reporte "${filename}" descargado correctamente.`, 'success');
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────────

function marcarFirebaseConectado() {
  const cfg = getConfig();
  saveConfig({ ...cfg, firebaseConectado: true });
  mostrarAlerta('Estado actualizado. Recuerda reemplazar storage.js con la versión Firebase.', 'info');
  renderFirebase();
}