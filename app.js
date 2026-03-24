/**
 * APP.JS — Inicialización, router y acciones globales
 * Actualizado para funcionar con Firebase (async/await)
 */

// ─── ESTADO DE LA APP ─────────────────────────────────────────────────────────

const appState = {
  vistaActual: 'dashboard',
  detalleProductoId: null,
  filtrosProductos: {},
};

// ─── ROUTER ───────────────────────────────────────────────────────────────────

async function navigate(vista, param = null) {
  appState.vistaActual = vista;
  appState.detalleProductoId = param;

  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.vista === vista.split('-')[0]);
  });

  mostrarCargando(true);

  try {
    switch (vista) {
      case 'dashboard':
        await renderDashboard();
        break;
      case 'productos':
        await renderProductos(appState.filtrosProductos);
        break;
      case 'detalle-producto':
        await renderDetalleProducto(param);
        break;
      case 'reportes':
        await renderReportes();
        break;
      case 'firebase':
        await renderFirebase();
        break;
      default:
        await renderDashboard();
    }
  } catch (err) {
    console.error('Error al navegar:', err);
    mostrarAlerta('Error al cargar los datos. Verifica la conexión con Firebase.', 'error');
  } finally {
    mostrarCargando(false);
  }

  document.getElementById('sidebar').classList.remove('open');
}

function mostrarCargando(activo) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.innerHTML = '<div class="loading-spinner">⏳ Cargando...</div>';
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:#64748b;';
    document.body.appendChild(el);
  }
  el.style.display = activo ? 'flex' : 'none';
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
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

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
    console.error(err);
    mostrarAlerta('Error al guardar el producto. Intenta de nuevo.', 'error');
  }
}

// ─── GUARDAR VENTA ────────────────────────────────────────────────────────────

async function guardarVenta() {
  const form = document.getElementById('form-venta');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.cantidad = parseInt(data.cantidad) || 0;
  data.precioUnitario = parseFloat(data.precioUnitario) || 0;

  const p = await getProductoEnriquecido(data.productoId);
  if (!p) return;

  const errores = validarVenta(data, p.stockActual);
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

  try {
    await addVenta(data);

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
    console.error(err);
    mostrarAlerta('Error al registrar la venta. Intenta de nuevo.', 'error');
  }
}

// ─── ELIMINAR PRODUCTO ────────────────────────────────────────────────────────

async function confirmarEliminar(id) {
  const p = await getProductoById(id);
  if (!confirm(`¿Eliminar el producto "${p?.nombre}"?\nTambién se eliminarán todas sus ventas. Esta acción no se puede deshacer.`)) return;
  try {
    await deleteProducto(id);
    mostrarAlerta('Producto eliminado.', 'info');
    await navigate('productos');
  } catch (err) {
    mostrarAlerta('Error al eliminar el producto.', 'error');
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
    mostrarAlerta('Error al eliminar la venta.', 'error');
  }
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
  try {
    await cargarDatosDemo();
    await navigate('dashboard');
  } catch (err) {
    console.error('Error al inicializar la app:', err);
    mostrarAlerta('No se pudo conectar con Firebase. Revisa la consola.', 'error');
  }

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);

// ─── DESCARGA DE REPORTES CSV ─────────────────────────────────────────────────

async function descargarReporte(tipo) {
  let csv = '';
  let filename = '';
  const sep = ';';

  const productos = await getProductosEnriquecidos();
  const ventas = await getVentas();

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
    const rows = await Promise.all(ventasOrdenadas.map(async v => {
      const p = await getProductoById(v.productoId);
      return [
        v.fecha, p?.nombre||'Eliminado', p?.sku||'-',
        v.cantidad, v.precioUnitario,
        v.cantidad * v.precioUnitario,
        v.cliente||'', v.obs||''
      ].join(sep);
    }));
    csv += rows.join('\n');

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

async function marcarFirebaseConectado() {
  const cfg = await getConfig();
  await saveConfig({ ...cfg, firebaseConectado: true });
  mostrarAlerta('¡Firebase conectado correctamente!', 'success');
  await renderFirebase();
}