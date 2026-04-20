/**
 * APP.JS — Inicialización, router y acciones globales v2.1
 * Animaciones de transición · Spinner de acción · Código para eliminar · Movimientos · Logo
 */

// ─── ESTADO DE LA APP ─────────────────────────────────────────────────────

const appState = {
  vistaActual: 'dashboard',
  detalleProductoId: null,
  filtrosProductos: {},
};

// ─── ROUTER CON ANIMACIÓN ─────────────────────────────────────────────────

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
      case 'movimientos':
        await renderMovimientos();
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
    // Animación de entrada del módulo
    const mainContent = document.getElementById('main-content');
    mainContent.classList.remove('view-entering');
    void mainContent.offsetWidth; // force reflow
    mainContent.classList.add('view-entering');
  } catch (err) {
    console.error('Error al navegar:', err);
    mostrarAlerta('Error al cargar los datos. Verifica la conexión con Firebase.', 'error');
  } finally {
    mostrarCargando(false);
  }

  document.getElementById('sidebar').classList.remove('open');
}

function mostrarCargando(activo) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = activo ? 'flex' : 'none';
}

function mostrarActionSpinner(activo) {
  const el = document.getElementById('action-spinner-overlay');
  if (el) el.style.display = activo ? 'flex' : 'none';
}

function startProgress() {
  const bar = document.getElementById('progress-bar-top');
  if (!bar) return;
  bar.className = 'progress-bar-top';
  bar.offsetWidth; // force reflow
  bar.classList.add('running');
}

function doneProgress() {
  const bar = document.getElementById('progress-bar-top');
  if (!bar) return;
  bar.classList.remove('running');
  bar.classList.add('done');
  setTimeout(() => { bar.className = 'progress-bar-top'; }, 500);
}
// ─── FILTROS ──────────────────────────────────────────────────────────────

async function aplicarFiltros() {
  appState.filtrosProductos = {
    busqueda: document.getElementById('f-busqueda')?.value || '',
    categoria: document.getElementById('f-categoria')?.value || '',
    estado: document.getElementById('f-estado')?.value || '',
    orden: document.getElementById('f-orden')?.value || '',
  };
  await renderProductos(appState.filtrosProductos);

  // Restaurar foco y cursor al final del input de búsqueda
  const input = document.getElementById('f-busqueda');
  if (input && document.activeElement !== input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
}

// ─── GUARDAR PRODUCTO ─────────────────────────────────────────────────────

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

  mostrarActionSpinner(true);

  try {
    if (id) {
      await updateProducto(id, data);
      mostrarAlerta('Producto actualizado correctamente.', 'success');
    } else {
      const nuevo = await addProducto(data);
      // Registrar movimiento de inversión inicial
      const invTotal = (data.precioUSD * data.tasaDolar * data.cantidad) + data.envio + data.otrosCostos;
      await addMovimiento({
        tipo: 'inversion',
        productoId: nuevo.id,
        productoNombre: data.nombre,
        descripcion: `Inversión inicial - ${data.cantidad} uds ${data.nombre}`,
        costoProductos: data.precioUSD * data.tasaDolar * data.cantidad,
        costoEnvio: data.envio,
        otrosCostos: data.otrosCostos,
        totalCOP: invTotal,
        cantidad: data.cantidad,
      });
      mostrarAlerta('Producto creado correctamente.', 'success');
    }
    closeModal();
    await navigate('productos');
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al guardar el producto. Intenta de nuevo.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

async function guardarEdicionMovimiento() {
  const form = document.getElementById('form-editar-mov');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.costoProductos = parseFloat(data.costoProductos) || 0;
  data.costoEnvio     = parseFloat(data.costoEnvio)     || 0;
  data.otrosCostos    = parseFloat(data.otrosCostos)    || 0;
  data.cantidad       = parseInt(data.cantidad)         || 0;

  mostrarActionSpinner(true);
  try {
    await updateMovimiento(data.movId, {
      descripcion:     data.descripcion,
      costoProductos:  data.costoProductos,
      costoEnvio:      data.costoEnvio,
      otrosCostos:     data.otrosCostos,
      cantidad:        data.cantidad,
    });
    mostrarAlerta('Movimiento actualizado.', 'success');
    closeModal();
    await navigate('movimientos');
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al actualizar el movimiento.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── GUARDAR VENTA (con cliente + teléfono obligatorios) ──────────────────

async function guardarVenta() {
  const form = document.getElementById('form-venta');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.cantidad = parseInt(data.cantidad) || 0;
  data.precioUnitario = parseFloat(data.precioUnitario) || 0;
  if (!data.ventaId?.trim()) delete data.ventaId;

  const p = await getProductoEnriquecido(data.productoId);
  if (!p) return;

  const errores = validarVenta(data, p.stockActual);
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

  mostrarActionSpinner(true);

  try {
    await addVenta(data);

    // Registrar movimiento de venta
    await addMovimiento({
      tipo: 'venta',
      productoId: data.productoId,
      productoNombre: p.nombre,
      descripcion: `Venta a ${data.cliente} - ${data.cantidad} uds`,
      costoProductos: 0,
      costoEnvio: 0,
      otrosCostos: 0,
      totalCOP: data.cantidad * data.precioUnitario,
      cantidad: data.cantidad,
    });

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
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── ELIMINAR PRODUCTO (requiere código 2356) ────────────────────────────

async function confirmarEliminar(id) {
  openModalEliminar(id);
}

async function ejecutarEliminar(id) {
  const input = document.getElementById('delete-code-input');
  const code = input?.value?.trim();

  if (code !== '2356') {
    mostrarAlerta('Código incorrecto. La eliminación fue cancelada.', 'error');
    if (input) {
      input.value = '';
      input.style.borderColor = 'var(--red)';
      input.focus();
    }
    return;
  }

  mostrarActionSpinner(true);

  try {
    await deleteProducto(id);
    mostrarAlerta('Producto eliminado.', 'info');
    closeModal();
    await navigate('productos');
  } catch (err) {
    mostrarAlerta('Error al eliminar el producto.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── ELIMINAR VENTA ───────────────────────────────────────────────────────

async function eliminarVenta(ventaId, productoId) {
  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>Confirmar eliminación</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p class="delete-confirm-msg">
          Para eliminar esta venta ingresa el código de seguridad:
        </p>
        <input type="text" id="delete-code-input" class="delete-confirm-input"
               placeholder="Código" maxlength="4" autocomplete="off">
        <p style="text-align:center;margin-top:10px;font-size:.78rem;color:var(--text-light)">
          Esta acción no se puede deshacer.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-primary" style="background:var(--red)"
                onclick="ejecutarEliminarVenta('${ventaId}','${productoId}')">Eliminar</button>
      </div>
    </div>
  `;
  openModalAnimate();
  setTimeout(() => document.getElementById('delete-code-input')?.focus(), 100);
}

async function ejecutarEliminarVenta(ventaId, productoId) {
  const input = document.getElementById('delete-code-input');
  const code = input?.value?.trim();

  if (code !== '2356') {
    mostrarAlerta('Código incorrecto. La eliminación fue cancelada.', 'error');
    if (input) {
      input.value = '';
      input.style.borderColor = 'var(--red)';
      input.focus();
    }
    return;
  }

  mostrarActionSpinner(true);
  try {
    await deleteVenta(ventaId);
    mostrarAlerta('Venta eliminada.', 'info');
    closeModal();
    await renderDetalleProducto(productoId);
  } catch (err) {
    mostrarAlerta('Error al eliminar la venta.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── EDITAR VENTA ─────────────────────────────────────────────────────────

async function guardarEdicionVenta() {
  const form = document.getElementById('form-editar-venta');
  if (!form) return;

  const data = Object.fromEntries(new FormData(form));
  data.cantidad = parseInt(data.cantidad) || 0;
  data.precioUnitario = parseFloat(data.precioUnitario) || 0;
  const stockDisponible = parseInt(data.stockDisponible) || 0;

  const errores = validarVenta(data, stockDisponible);
  if (errores.length) {
    mostrarAlerta(errores.join('\n'), 'error');
    return;
  }

  mostrarActionSpinner(true);

  try {
    await updateVenta(data.ventaId, {
      ventaId: data.ventaIdLegible || '',
      fecha: data.fecha,
      cantidad: data.cantidad,
      precioUnitario: data.precioUnitario,
      cliente: data.cliente,
      telefono: data.telefono,
      obs: data.obs || '',
    });

    // Verificar si el producto quedó agotado o tiene stock
    const nuevo = await getProductoEnriquecido(data.productoId);
    if (nuevo.stockActual === 0) {
      await updateProducto(data.productoId, { estado: 'agotado' });
    } else if (nuevo.stockActual > 0) {
      const pActual = await getProductoById(data.productoId);
      if (pActual.estado === 'agotado') {
        await updateProducto(data.productoId, { estado: 'activo' });
      }
    }

    mostrarAlerta('Venta actualizada correctamente.', 'success');
    closeModal();

    if (appState.vistaActual === 'detalle-producto') {
      await renderDetalleProducto(data.productoId);
    } else {
      await navigate('productos');
    }
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al actualizar la venta. Intenta de nuevo.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── ALERTAS (toast abajo a la derecha con ícono) ────────────────────────

function mostrarAlerta(mensaje, tipo = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;

  const iconMap = {
    success: `<span class="toast-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>`,
    error: `<span class="toast-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>`,
    info: `<span class="toast-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>`,
  };

  el.innerHTML = `${iconMap[tipo] || iconMap.info}<span>${mensaje}</span>`;
  el.className = `toast toast-${tipo}`;
  // Force reflow para reiniciar animación
  void el.offsetWidth;
  el.classList.add('show');

  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ─── REPONER STOCK ────────────────────────────────────────────────────────

async function guardarReposicion(productoId) {
  const form = document.getElementById('form-reposicion');
  if (!form) return;

  const d = Object.fromEntries(new FormData(form));
  const cantNueva = parseInt(d.cantidadNueva) || 0;
  const usdNuevo = parseFloat(d.precioUSDNuevo) || 0;
  const tasaNueva = parseFloat(d.tasaDolarNuevo) || 0;
  const envioNuevo = parseFloat(d.envioNuevo) || 0;
  const otrosNuevo = parseFloat(d.otrosCostosNuevo) || 0;

  if (cantNueva <= 0) { mostrarAlerta('Ingresa una cantidad válida.', 'error'); return; }
  if (usdNuevo <= 0) { mostrarAlerta('Ingresa el precio en USD.', 'error'); return; }
  if (tasaNueva <= 0) { mostrarAlerta('Ingresa la tasa del dólar.', 'error'); return; }

  const p = await getProductoById(productoId);
  if (!p) return;

  const invAnterior = (p.precioUSD * p.tasaDolar * p.cantidad) + (p.envio || 0) + (p.otrosCostos || 0);
  const invNuevoLote = (usdNuevo * tasaNueva * cantNueva) + envioNuevo + otrosNuevo;
  const totalCantidad = p.cantidad + cantNueva;
  const totalInversion = invAnterior + invNuevoLote;
  const costoPromedioUSD = totalCantidad > 0 ? (totalInversion / tasaNueva) / totalCantidad : usdNuevo;

  mostrarActionSpinner(true);

  try {
    await updateProducto(productoId, {
      cantidad: totalCantidad,
      precioUSD: parseFloat(costoPromedioUSD.toFixed(4)),
      tasaDolar: tasaNueva,
      envio: 0,
      otrosCostos: 0,
      estado: 'activo',
    });

    // Registrar movimiento de reposición
    await addMovimiento({
      tipo: 'reposicion',
      productoId: productoId,
      productoNombre: p.nombre,
      descripcion: `Reposición - +${cantNueva} uds ${p.nombre}`,
      costoProductos: usdNuevo * tasaNueva * cantNueva,
      costoEnvio: envioNuevo,
      otrosCostos: otrosNuevo,
      totalCOP: invNuevoLote,
      cantidad: cantNueva,
    });

    mostrarAlerta(`Stock actualizado: +${cantNueva} unidades agregadas. Nuevo total: ${totalCantidad} uds.`, 'success');
    closeModal();

    if (appState.vistaActual === 'detalle-producto') {
      await renderDetalleProducto(productoId);
    } else {
      await navigate('productos');
    }
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al reponer el stock. Intenta de nuevo.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── LOGO ─────────────────────────────────────────────────────────────────

function openLogoUpload() {
  document.getElementById('logo-file-input').click();
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const img = document.getElementById('header-logo-img');
    const fallback = document.getElementById('header-avatar-fallback');
    img.src = dataUrl;
    img.style.display = 'block';
    fallback.style.display = 'none';

    // Guardar en config de Firebase
    saveConfig({ ...(window._lastConfig || {}), logoDataUrl: dataUrl }).catch(() => {});
    mostrarAlerta('Logo actualizado.', 'success');
  };
  reader.readAsDataURL(file);
}

async function cargarLogo() {
  try {
    const cfg = await getConfig();
    window._lastConfig = cfg;
    if (cfg.logoDataUrl) {
      const img = document.getElementById('header-logo-img');
      const fallback = document.getElementById('header-avatar-fallback');
      if (img && fallback) {
        img.src = cfg.logoDataUrl;
        img.style.display = 'block';
        fallback.style.display = 'none';
      }
    }
  } catch (e) {
    // silently ignore
  }
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────

async function marcarFirebaseConectado() {
  const cfg = await getConfig();
  await saveConfig({ ...cfg, firebaseConectado: true });
  mostrarAlerta('Firebase conectado correctamente.', 'success');
  await renderFirebase();
}

// ─── DESCARGA DE REPORTES CSV ─────────────────────────────────────────────

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
    const headers = ['Fecha','Producto','SKU','Cantidad','Precio Unitario','Total Venta','Cliente','Telefono','Observacion'];
    csv = headers.join(sep) + '\n';
    const ventasOrdenadas = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    const rows = await Promise.all(ventasOrdenadas.map(async v => {
      const p = await getProductoById(v.productoId);
      return [
        v.fecha, p?.nombre||'Eliminado', p?.sku||'-',
        v.cantidad, v.precioUnitario,
        v.cantidad * v.precioUnitario,
        v.cliente||'', v.telefono||'', v.obs||''
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

  } else if (tipo === 'general') {
    filename = 'centris_reporte_general.csv';
    const fecha = new Date().toLocaleDateString('es-CO');

    // Sección 1: Inventario
    csv += `REPORTE GENERAL CENTRIS - ${fecha}\n\n`;
    csv += `=== INVENTARIO COMPLETO ===\n`;
    csv += ['SKU','Nombre','Categoria','Proveedor','Precio USD','Tasa','Cantidad','Envio','Otros Costos','Inversion Total','Costo Unit.','Precio Sugerido','Vendidas','Stock','Recuperado','Ganancia','Recuperacion %','Estado'].join(sep) + '\n';
    csv += productos.map(p => [
      p.sku, p.nombre, p.categoria||'', p.proveedor||'',
      p.precioUSD, p.tasaDolar, p.cantidad, p.envio||0, p.otrosCostos||0,
      Math.round(p.inversionTotal), Math.round(p.costoUnitario), p.precioSugerido||0,
      p.unidadesVendidas, p.stockActual,
      Math.round(p.totalRecuperado), Math.round(p.ganancia),
      p.recuperacionPct.toFixed(1)+'%', p.estado
    ].join(sep)).join('\n');

    // Sección 2: Ventas
    csv += '\n\n=== HISTORIAL DE VENTAS ===\n';
    csv += ['ID Venta','Fecha','Producto','SKU','Cliente','Telefono','Cantidad','Precio Unit.','Total Venta','Observacion'].join(sep) + '\n';
    const ventasOrdenadas2 = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    const rows2 = await Promise.all(ventasOrdenadas2.map(async v => {
      const p = await getProductoById(v.productoId);
      return [
        v.ventaId||'', v.fecha, p?.nombre||'Eliminado', p?.sku||'-',
        v.cliente||'', v.telefono||'', v.cantidad, v.precioUnitario,
        v.cantidad * v.precioUnitario, v.obs||''
      ].join(sep);
    }));
    csv += rows2.join('\n');

    // Sección 3: Stock
    csv += '\n\n=== ESTADO DEL STOCK ===\n';
    csv += ['SKU','Nombre','Categoria','Compradas','Vendidas','Stock Actual','Estado Stock','Estado'].join(sep) + '\n';
    csv += productos.map(p => [
      p.sku, p.nombre, p.categoria||'',
      p.cantidad, p.unidadesVendidas, p.stockActual,
      p.estadoStock, p.estado
    ].join(sep)).join('\n');

    // Sección 4: Resumen financiero
    csv += '\n\n=== RESUMEN FINANCIERO ===\n';
    csv += ['SKU','Nombre','Inversion','Recuperado','Ganancia','Recuperacion %','Costo Unit.','Precio Sugerido','Margen %'].join(sep) + '\n';
    csv += productos.map(p => {
      const margen = p.precioSugerido > 0 ? ((p.precioSugerido - p.costoUnitario) / p.precioSugerido * 100).toFixed(1) : '0';
      return [
        p.sku, p.nombre,
        Math.round(p.inversionTotal), Math.round(p.totalRecuperado),
        Math.round(p.ganancia), p.recuperacionPct.toFixed(1)+'%',
        Math.round(p.costoUnitario), p.precioSugerido||0, margen+'%'
      ].join(sep);
    }).join('\n');

    // Totales
    const totInv = productos.reduce((s,p) => s + p.inversionTotal, 0);
    const totRec = productos.reduce((s,p) => s + p.totalRecuperado, 0);
    const totGan = productos.reduce((s,p) => s + p.ganancia, 0);
    csv += '\n\n=== TOTALES ===\n';
    csv += `Total Invertido${sep}${Math.round(totInv)}\n`;
    csv += `Total Recuperado${sep}${Math.round(totRec)}\n`;
    csv += `Ganancia Total${sep}${Math.round(totGan)}\n`;
    csv += `Total Productos${sep}${productos.length}\n`;
    csv += `Total Ventas${sep}${ventas.length}\n`;
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

// ─── INIT ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    await cargarLogo();
    await navigate('dashboard');
  } catch (err) {
    console.error('Error al inicializar la app:', err);
    mostrarAlerta('No se pudo conectar con Firebase. Revisa la consola.', 'error');
  }

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // El modal no se cierra al hacer clic fuera de él
}

document.addEventListener('DOMContentLoaded', init);