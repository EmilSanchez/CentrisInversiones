/**
 * APP.JS — Inicialización, router y acciones globales (versión async/Firebase)
 */

const appState = {
  vistaActual: 'dashboard',
  detalleProductoId: null,
  filtrosProductos: {},
};

// ─── LOADING HELPER ───────────────────────────────────────────────────────────

function mostrarLoading() {
  document.querySelector('#main-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px">
      <div class="spinner"></div>
      <span style="color:var(--text-muted);font-size:.9rem">Cargando datos…</span>
    </div>`;
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

async function navigate(vista, param = null) {
  appState.vistaActual = vista;
  appState.detalleProductoId = param;

  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.vista === vista.split('-')[0]);
  });

  mostrarLoading();

  try {
    switch (vista) {
      case 'dashboard':      await renderDashboard(); break;
      case 'productos':      await renderProductos(appState.filtrosProductos); break;
      case 'detalle-producto': await renderDetalleProducto(param); break;
      case 'reportes':       await renderReportes(); break;
      case 'firebase':       renderFirebase(); break;
      default:               await renderDashboard();
    }
  } catch (err) {
    console.error('Error al navegar:', err);
    document.querySelector('#main-content').innerHTML = `
      <div style="padding:40px;text-align:center">
        <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
        <h3 style="color:var(--red);margin-bottom:8px">Error al cargar datos</h3>
        <p style="color:var(--text-muted);font-size:.9rem">${err.message}</p>
        <button class="btn-primary" style="margin-top:16px" onclick="navigate('dashboard')">Reintentar</button>
      </div>`;
  }

  document.getElementById('sidebar').classList.remove('open');
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

async function aplicarFiltros() {
  appState.filtrosProductos = {
    busqueda: document.getElementById('f-busqueda')?.value || '',
    categoria: document.getElementById('f-categoria')?.value || '',
    estado: document.getElementById('f-estado')?.value || '',
    orden: document.getElementById('f-orden')?.value || '',
  };
  await renderProductos(appState.filtrosProductos);
}

// ─── GUARDAR PRODUCTO ─────────────────────────────────────────────────────────

async function guardarProducto(id) {
  const form = document.getElementById('form-producto');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  ['precioUSD', 'tasaDolar', 'cantidad', 'envio', 'otrosCostos', 'precioSugerido'].forEach(k => {
    data[k] = parseFloat(data[k]) || 0;
  });

  const errores = validarProducto(data);
  if (errores.length) { mostrarAlerta(errores.join('\n'), 'error'); return; }

  try {
    if (id) {
      await updateProducto(id, data);
      mostrarAlerta('Producto actualizado correctamente.', 'success');
    } else {
      await addProducto(data);
      mostrarAlerta('Producto creado correctamente.', 'success');
    }
    closeModal();
    await navigate('productos');
  } catch (err) {
    mostrarAlerta('Error al guardar: ' + err.message, 'error');
  }
}

// ─── GUARDAR VENTA ────────────────────────────────────────────────────────────

async function guardarVenta() {
  const form = document.getElementById('form-venta');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.cantidad = parseInt(data.cantidad) || 0;
  data.precioUnitario = parseFloat(data.precioUnitario) || 0;

  try {
    const p = await getProductoEnriquecido(data.productoId);
    if (!p) return;

    const errores = validarVenta(data, p.stockActual);
    if (errores.length) { mostrarAlerta(errores.join('\n'), 'error'); return; }

    await addVenta(data);

    // Si stock llega a 0, actualizar estado
    const nuevo = await getProductoEnriquecido(data.productoId);
    if (nuevo.stockActual === 0) {
      await updateProducto(data.productoId, { estado: 'agotado' });
    }

    mostrarAlerta('Venta registrada correctamente.', 'success');
    closeModal();

    if (appState.vistaActual === 'detalle-producto') {
      await renderDetalleProducto(data.productoId);
    } else {
      await navigate('productos');
    }
  } catch (err) {
    mostrarAlerta('Error al registrar venta: ' + err.message, 'error');
  }
}

// ─── ELIMINAR PRODUCTO ────────────────────────────────────────────────────────

async function confirmarEliminar(id) {
  const p = await getProductoById(id);
  if (!confirm(`¿Eliminar el producto "${p?.nombre}"?\nTambién se eliminarán todas sus ventas.`)) return;
  try {
    await deleteProducto(id);
    mostrarAlerta('Producto eliminado.', 'info');
    await navigate('productos');
  } catch (err) {
    mostrarAlerta('Error al eliminar: ' + err.message, 'error');
  }
}

// ─── ELIMINAR VENTA ───────────────────────────────────────────────────────────

async function eliminarVenta(ventaId, productoId) {
  if (!confirm('¿Eliminar este registro de venta?')) return;
  try {
    await deleteVenta(ventaId);
    mostrarAlerta('Venta eliminada.', 'info');
    await renderDetalleProducto(productoId);
  } catch (err) {
    mostrarAlerta('Error al eliminar: ' + err.message, 'error');
  }
}

// ─── DESCARGA DE REPORTES CSV ─────────────────────────────────────────────────

async function descargarReporte(tipo) {
  mostrarAlerta('Generando reporte…', 'info');
  let csv = '';
  let filename = '';
  const sep = ';';

  try {
    const productos = await getProductosEnriquecidos();
    const ventas = await getVentas();

    if (tipo === 'inventario') {
      filename = 'centris_inventario.csv';
      const h = ['SKU','Nombre','Categoria','Proveedor','Precio USD','Tasa Dolar','Cantidad Comprada','Envio','Otros Costos','Inversion Total','Costo Unitario','Precio Sugerido','Unidades Vendidas','Stock Actual','Total Recuperado','Ganancia','Recuperacion %','Estado'];
      csv = h.join(sep) + '\n' + productos.map(p => [
        p.sku, p.nombre, p.categoria||'', p.proveedor||'',
        p.precioUSD, p.tasaDolar, p.cantidad, p.envio||0, p.otrosCostos||0,
        Math.round(p.inversionTotal), Math.round(p.costoUnitario), p.precioSugerido||0,
        p.unidadesVendidas, p.stockActual, Math.round(p.totalRecuperado),
        Math.round(p.ganancia), p.recuperacionPct.toFixed(1)+'%', p.estado
      ].join(sep)).join('\n');

    } else if (tipo === 'ventas') {
      filename = 'centris_ventas.csv';
      const h = ['Fecha','Producto','SKU','Cantidad','Precio Unitario','Total Venta','Cliente','Observacion'];
      const ventasOrd = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
      csv = h.join(sep) + '\n' + ventasOrd.map(v => {
        const p = productos.find(x => x.id === v.productoId);
        return [v.fecha, p?.nombre||'Eliminado', p?.sku||'-', v.cantidad, v.precioUnitario, v.cantidad*v.precioUnitario, v.cliente||'', v.obs||''].join(sep);
      }).join('\n');

    } else if (tipo === 'stock') {
      filename = 'centris_stock.csv';
      const h = ['SKU','Nombre','Categoria','Cantidad Comprada','Vendidas','Stock Actual','Estado Stock','Estado Producto'];
      csv = h.join(sep) + '\n' + productos.map(p => [p.sku, p.nombre, p.categoria||'', p.cantidad, p.unidadesVendidas, p.stockActual, p.estadoStock, p.estado].join(sep)).join('\n');

    } else if (tipo === 'resumen') {
      filename = 'centris_resumen_financiero.csv';
      const h = ['SKU','Nombre','Inversion Total','Total Recuperado','Ganancia','Recuperacion %','Costo Unitario','Precio Sugerido','Margen %'];
      csv = h.join(sep) + '\n' + productos.map(p => {
        const margen = p.precioSugerido > 0 ? ((p.precioSugerido - p.costoUnitario)/p.precioSugerido*100).toFixed(1) : '0';
        return [p.sku, p.nombre, Math.round(p.inversionTotal), Math.round(p.totalRecuperado), Math.round(p.ganancia), p.recuperacionPct.toFixed(1)+'%', Math.round(p.costoUnitario), p.precioSugerido||0, margen+'%'].join(sep);
      }).join('\n');
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    closeModal();
    mostrarAlerta(`"${filename}" descargado correctamente.`, 'success');
  } catch (err) {
    mostrarAlerta('Error al generar reporte: ' + err.message, 'error');
  }
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────────

async function marcarFirebaseConectado() {
  const cfg = await getConfig();
  await saveConfig({ ...cfg, firebaseConectado: true });
  mostrarAlerta('Estado actualizado.', 'info');
  renderFirebase();
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

async function init() {
  await cargarDatosDemo();
  await navigate('dashboard');

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);