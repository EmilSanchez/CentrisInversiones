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
    const titles = {
      'dashboard':        ['Dashboard', 'Historial de ventas'],
      'productos':        ['Productos', 'Gestión de inventario'],
      'detalle-producto': ['Detalle producto', ''],
      'movimientos':      ['Movimientos', 'Historial de inversiones'],
      'reportes':         ['Reportes', 'Análisis financiero'],
      'configuracion':    ['Configuración', 'Ajustes del sistema'],
      'firebase':         ['Configuración', 'Ajustes del sistema'],
    };
    const [t, s] = titles[vista] || ['', ''];
    const el1 = document.getElementById('header-page-title');
    const el2 = document.getElementById('header-page-sub');
    if (el1) el1.textContent = t;
    if (el2) el2.textContent = s;

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
      case 'configuracion':
        await renderConfiguracion();
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

    const vistaActual = appState.vistaActual;
    if (vistaActual === 'detalle-producto') {
      await renderDetalleProducto(data.productoId);
    } else if (vistaActual === 'dashboard') {
      await renderDashboard();
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

// ─── DESCARGA DE REPORTES (CSV / EXCEL / PDF) ─────────────────────────────

async function descargarReporte(tipo) {
  const formato = window._reporteFormato || 'excel';
  const mesSeleccionado = document.getElementById('rep-mes-select')?.value || '';

  let secciones = null;
  if (tipo === 'general') {
    const checks = document.querySelectorAll('.rep-check:checked');
    secciones = [...checks].map(c => c.value);
    if (secciones.length === 0) {
      mostrarAlerta('Selecciona al menos una sección para el reporte.', 'error');
      return;
    }
  }
  closeModal();
  mostrarActionSpinner(true);

  try {
    let productos = await getProductosEnriquecidos();
    let ventas = await getVentas();

    // Filtrar por mes si se seleccionó uno
    if (mesSeleccionado) {
      ventas = ventas.filter(v => v.fecha && v.fecha.startsWith(mesSeleccionado));
    }

    if (formato === 'pdf') {
      await descargarReportePDF(tipo, productos, ventas, secciones, mesSeleccionado);
    } else if (formato === 'excel') {
      await descargarReporteExcel(tipo, productos, ventas, secciones, mesSeleccionado);
    } else {
      await descargarReporteCSV(tipo, productos, ventas, secciones);
    }
    mostrarAlerta(`Reporte descargado correctamente.`, 'success');
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al generar el reporte. Verifica la consola.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function copFmt(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);
}

function mesLabel(mesStr) {
  if (!mesStr || mesStr === 'sin-fecha') return 'Sin fecha';
  const [anio, mes] = mesStr.split('-');
  const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${nombres[parseInt(mes, 10) - 1]} ${anio}`;
}

function calcularMeses(productos, ventas) {
  const mesesMap = {};
  ventas.forEach(v => {
    const mes = v.fecha?.slice(0, 7) || 'sin-fecha';
    if (!mesesMap[mes]) mesesMap[mes] = { mes, total: 0, unidades: 0, numVentas: 0, ganancia: 0 };
    mesesMap[mes].total += (v.cantidad || 0) * (v.precioUnitario || 0);
    mesesMap[mes].unidades += v.cantidad || 0;
    mesesMap[mes].numVentas++;
    const prod = productos.find(p => p.id === v.productoId);
    if (prod) mesesMap[mes].ganancia += (v.precioUnitario - prod.costoUnitario) * (v.cantidad || 0);
  });
  return Object.values(mesesMap).sort((a, b) => b.mes.localeCompare(a.mes));
}

// ─── EXCEL ────────────────────────────────────────────────────────────────

async function descargarReporteExcel(tipo, productos, ventas, secciones, mesSeleccionado = '') {
  const wb = XLSX.utils.book_new();
  const mostrar = (sec) => !secciones || secciones.includes(sec);
  const mesLabel2 = mesSeleccionado ? ` (${mesLabel(mesSeleccionado)})` : '';

  const addSheet = (nombre, filas) => {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, nombre);
  };

  if ((tipo === 'inventario' || tipo === 'general') && mostrar('inventario')) {
    const rows = [
      ['SKU','Nombre','Categoría','Proveedor','Precio USD','Tasa','Cant. comprada','Envío','Otros costos','Inversión total','Costo unitario','Precio sugerido','Vendidas','Stock actual','Recuperado','Ganancia','Recuperación %','Estado'],
      ...productos.map(p => [
        p.sku, p.nombre, p.categoria||'', p.proveedor||'',
        p.precioUSD, p.tasaDolar, p.cantidad, p.envio||0, p.otrosCostos||0,
        Math.round(p.inversionTotal), Math.round(p.costoUnitario), p.precioSugerido||0,
        p.unidadesVendidas, p.stockActual,
        Math.round(p.totalRecuperado), Math.round(p.ganancia),
        parseFloat(p.recuperacionPct.toFixed(1))+'%', p.estado
      ])
    ];
    addSheet('Inventario', rows);
  }

  if ((tipo === 'ventas' || tipo === 'general') && mostrar('ventas')) {
    const ventasOrdenadas = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    const rows = [
      ['ID Venta','Fecha','Producto','SKU','Cliente','Teléfono','Cantidad','Precio unitario','Total venta','Observación'],
      ...await Promise.all(ventasOrdenadas.map(async v => {
        const p = productos.find(x => x.id === v.productoId);
        return [v.ventaId||'', v.fecha, p?.nombre||'Eliminado', p?.sku||'-', v.cliente||'', v.telefono||'', v.cantidad, v.precioUnitario, v.cantidad * v.precioUnitario, v.obs||''];
      }))
    ];
    addSheet('Ventas', rows);
  }

  if ((tipo === 'meses' || tipo === 'general') && mostrar('meses')) {
    const meses = calcularMeses(productos, ventas);
    const rows = [
      ['Mes','N° ventas','Unidades','Total ingresado','Ganancia'],
      ...meses.map(m => [mesLabel(m.mes), m.numVentas, m.unidades, Math.round(m.total), Math.round(m.ganancia)])
    ];
    addSheet('Por mes', rows);
  }

  if ((tipo === 'stock' || tipo === 'general') && mostrar('stock')) {
    const rows = [
      ['SKU','Nombre','Categoría','Cant. comprada','Vendidas','Stock actual','Estado stock','Estado'],
      ...productos.map(p => [p.sku, p.nombre, p.categoria||'', p.cantidad, p.unidadesVendidas, p.stockActual, p.estadoStock, p.estado])
    ];
    addSheet('Stock', rows);
  }

  if ((tipo === 'resumen' || tipo === 'general') && mostrar('resumen')) {
    const rows = [
      ['SKU','Nombre','Cantidad Comprada','Cantidad Vendida','En Stock','Inversión','Recuperado','Ganancia','% de Recuperación'],
      ...productos.map(p => [
        p.sku, p.nombre, p.cantidad, p.unidadesVendidas, p.stockActual,
        Math.round(p.inversionTotal), Math.round(p.totalRecuperado), Math.round(p.ganancia),
        parseFloat(p.recuperacionPct.toFixed(1))+'%'
      ])
    ];
    addSheet('Resumen financiero', rows);
  }

  if (tipo === 'general' && mostrar('totales')) {
    const totInv = productos.reduce((s,p) => s + p.inversionTotal, 0);
    const totRec = productos.reduce((s,p) => s + p.totalRecuperado, 0);
    const totGan = productos.reduce((s,p) => s + p.ganancia, 0);
    addSheet('Totales', [
      ['Indicador','Valor'],
      ['Total Invertido', Math.round(totInv)],
      ['Total Recuperado', Math.round(totRec)],
      ['Ganancia Total', Math.round(totGan)],
      ['Total Productos', productos.length],
      ['Total Ventas', ventas.length],
    ]);
  }

  const fecha = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `centris_${tipo}_${fecha}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────

async function descargarReportePDF(tipo, productos, ventas, secciones, mesSeleccionado = '') {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = 297;
  const ML = 10, MR = 10;
  const TW = PW - ML - MR;
  const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
  const GRIS = [75, 85, 99];
  let yPos = 0;

  function addCover(titulo) {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, PW, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('CENTRIS INVERSIONES', ML + 4, 12);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const subtitulo = mesSeleccionado ? `${titulo} — ${mesLabel(mesSeleccionado)}` : titulo;
    doc.text(subtitulo, ML + 4, 21);
    doc.text(fecha, PW - MR - 4, 21, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos = 38;
  }

  function addSectionTitle(txt) {
    if (yPos > 175) { doc.addPage(); yPos = 15; }
    doc.setFillColor(241, 245, 249);
    doc.rect(ML, yPos - 5, TW, 9, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(txt, ML + 4, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
  }

  function addTable(head, rows, colStyles = {}) {
    doc.autoTable({
      startY: yPos,
      head: [head],
      body: rows,
      tableWidth: TW,
      margin: { left: ML, right: MR },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: colStyles,
      didDrawPage: () => { yPos = doc.lastAutoTable.finalY + 10; },
    });
    yPos = doc.lastAutoTable.finalY + 12;
  }

  const tituloMap = { general: 'General Completo', inventario: 'Inventario', ventas: 'Ventas', meses: 'Mensual', stock: 'Stock', resumen: 'Resumen Financiero', totales: 'Totales' };
  const titulo = tipo === 'general' ? 'General Completo' : (tituloMap[tipo] || tipo);
  addCover('Reporte ' + titulo);

  const mostrar = (sec) => !secciones || secciones.includes(sec);

  if ((tipo === 'inventario' || tipo === 'general') && mostrar('inventario')) {
    addSectionTitle('Inventario completo');
    // SKU=22 Nombre=auto Categoria=28 Cant=13 Stock=13 Inversion=30 Recuperado=30 Ganancia=30 Estado=18
    addTable(
      ['SKU', 'Nombre', 'Categoria', 'Cant.', 'Stock', 'Inversion', 'Recuperado', 'Ganancia', 'Estado'],
      productos.map(p => [
        p.sku, p.nombre, p.categoria||'—',
        p.cantidad, p.stockActual,
        copFmt(p.inversionTotal), copFmt(p.totalRecuperado), copFmt(p.ganancia),
        p.estado
      ]),
      {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 32, halign: 'right' },
        6: { cellWidth: 32, halign: 'right' },
        7: { cellWidth: 32, halign: 'right' },
        8: { cellWidth: 20, halign: 'center' },
      }
    );
  }

  if ((tipo === 'ventas' || tipo === 'general') && mostrar('ventas')) {
    addSectionTitle('Historial de ventas');
    const ventasOrdenadas = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    const rows = ventasOrdenadas.map(v => {
      const p = productos.find(x => x.id === v.productoId);
      return [v.ventaId||'—', v.fecha, p?.nombre||'Eliminado', v.cliente||'—', v.cantidad, copFmt(v.precioUnitario), copFmt(v.cantidad * v.precioUnitario)];
    });
    addTable(
      ['ID Venta', 'Fecha', 'Producto', 'Cliente', 'Cant.', 'Precio unit.', 'Total'],
      rows,
      {
        0: { cellWidth: 35 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 32, halign: 'right' },
        6: { cellWidth: 32, halign: 'right' },
      }
    );
  }

  if ((tipo === 'meses' || tipo === 'general') && mostrar('meses')) {
    addSectionTitle('Resumen mensual de ventas');
    const meses = calcularMeses(productos, ventas);
    addTable(
      ['Mes', 'N\u00b0 ventas', 'Unidades', 'Total ingresado', 'Ganancia del mes'],
      meses.map(m => [mesLabel(m.mes), m.numVentas, m.unidades, copFmt(m.total), copFmt(m.ganancia)]),
      {
        0: { cellWidth: 50 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 50, halign: 'right' },
        4: { cellWidth: 50, halign: 'right' },
      }
    );
  }

  if ((tipo === 'stock' || tipo === 'general') && mostrar('stock')) {
    addSectionTitle('Estado del stock');
    addTable(
      ['SKU', 'Nombre', 'Categoria', 'Compradas', 'Vendidas', 'Stock actual', 'Estado stock', 'Estado'],
      productos.map(p => [p.sku, p.nombre, p.categoria||'—', p.cantidad, p.unidadesVendidas, p.stockActual, p.estadoStock, p.estado]),
      {
        0: { cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
        7: { cellWidth: 22, halign: 'center' },
      }
    );
  }

  if ((tipo === 'resumen' || tipo === 'general') && mostrar('resumen')) {
    addSectionTitle('Resumen financiero');
    addTable(
      ['SKU', 'Nombre', 'Cant. Comprada', 'Cant. Vendida', 'En Stock', 'Inversion', 'Recuperado', 'Ganancia', '% Recuperacion'],
      productos.map(p => [
        p.sku, p.nombre, p.cantidad, p.unidadesVendidas, p.stockActual,
        copFmt(p.inversionTotal), copFmt(p.totalRecuperado), copFmt(p.ganancia), p.recuperacionPct.toFixed(1)+'%'
      ]),
      {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
        6: { cellWidth: 30, halign: 'right' },
        7: { cellWidth: 30, halign: 'right' },
        8: { cellWidth: 24, halign: 'center' },
      }
    );
  }

  if ((tipo === 'general') && mostrar('totales')) {
    addSectionTitle('Totales generales');
    const totInv = productos.reduce((s,p) => s + p.inversionTotal, 0);
    const totRec = productos.reduce((s,p) => s + p.totalRecuperado, 0);
    const totGan = productos.reduce((s,p) => s + p.ganancia, 0);
    addTable(
      ['Indicador', 'Valor'],
      [
        ['Total invertido', copFmt(totInv)],
        ['Total recuperado', copFmt(totRec)],
        ['Ganancia total', copFmt(totGan)],
        ['Total productos', productos.length],
        ['Total ventas registradas', ventas.length],
      ],
      {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
      }
    );
  }

  // Footer en todas las paginas
  const totalPags = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPags; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(`Centris Inversiones  \u00b7  Generado el ${fecha}  \u00b7  Pag. ${i} de ${totalPags}`, PW / 2, 206, { align: 'center' });
  }

  const fechaISO = new Date().toISOString().slice(0,10);
  doc.save(`centris_${tipo}_${fechaISO}.pdf`);
}

// ─── CSV (legado) ─────────────────────────────────────────────────────────

async function descargarReporteCSV(tipo, productos, ventas) {
  let csv = '';
  let filename = '';
  const sep = ';';

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
      const p = productos.find(x => x.id === v.productoId);
      return [v.fecha, p?.nombre||'Eliminado', p?.sku||'-', v.cantidad, v.precioUnitario, v.cantidad * v.precioUnitario, v.cliente||'', v.telefono||'', v.obs||''].join(sep);
    }));
    csv += rows.join('\n');

  } else if (tipo === 'meses') {
    filename = 'centris_mensual.csv';
    const meses = calcularMeses(productos, ventas);
    csv = ['Mes','N° ventas','Unidades','Total ingresado','Ganancia'].join(sep) + '\n';
    csv += meses.map(m => [mesLabel(m.mes), m.numVentas, m.unidades, Math.round(m.total), Math.round(m.ganancia)].join(sep)).join('\n');

  } else if (tipo === 'stock') {
    filename = 'centris_stock.csv';
    csv = ['SKU','Nombre','Categoria','Cantidad Comprada','Vendidas','Stock Actual','Estado Stock','Estado Producto'].join(sep) + '\n';
    csv += productos.map(p => [p.sku, p.nombre, p.categoria||'', p.cantidad, p.unidadesVendidas, p.stockActual, p.estadoStock, p.estado].join(sep)).join('\n');

  } else if (tipo === 'resumen') {
    filename = 'centris_resumen_financiero.csv';
    csv = ['SKU','Nombre','Cantidad Comprada','Cantidad Vendida','En Stock','Inversion','Recuperado','Ganancia','% de Recuperacion'].join(sep) + '\n';
    csv += productos.map(p => {
      return [p.sku, p.nombre, p.cantidad, p.unidadesVendidas, p.stockActual, Math.round(p.inversionTotal), Math.round(p.totalRecuperado), Math.round(p.ganancia), p.recuperacionPct.toFixed(1)+'%'].join(sep);
    }).join('\n');

  } else if (tipo === 'general') {
    filename = 'centris_reporte_general.csv';
    const fechaStr = new Date().toLocaleDateString('es-CO');
    csv += `REPORTE GENERAL CENTRIS - ${fechaStr}\n\n`;
    csv += `=== INVENTARIO ===\n`;
    csv += ['SKU','Nombre','Inversion Total','Recuperado','Ganancia','Stock','Estado'].join(sep) + '\n';
    csv += productos.map(p => [p.sku, p.nombre, Math.round(p.inversionTotal), Math.round(p.totalRecuperado), Math.round(p.ganancia), p.stockActual, p.estado].join(sep)).join('\n');
    csv += '\n\n=== VENTAS ===\n';
    csv += ['Fecha','Producto','Cliente','Cantidad','Total'].join(sep) + '\n';
    const ventasOrd = [...ventas].sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
    ventasOrd.forEach(v => {
      const p = productos.find(x => x.id === v.productoId);
      csv += [v.fecha, p?.nombre||'Eliminado', v.cliente||'', v.cantidad, v.cantidad*v.precioUnitario].join(sep) + '\n';
    });
    const meses = calcularMeses(productos, ventas);
    csv += '\n\n=== MENSUAL ===\n';
    csv += ['Mes','Ventas','Unidades','Total','Ganancia'].join(sep) + '\n';
    csv += meses.map(m => [mesLabel(m.mes), m.numVentas, m.unidades, Math.round(m.total), Math.round(m.ganancia)].join(sep)).join('\n');
  }

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── DESCARGA REPORTE DE MOVIMIENTOS ───────────────────────────────────────

async function descargarReporteMovimientos() {
  const formato = window._movReporteFormato || 'excel';
  const tipoFiltro = document.getElementById('mov-rep-tipo-select')?.value || 'todos';
  const desde = document.getElementById('mov-rep-desde')?.value || '';
  const hasta = document.getElementById('mov-rep-hasta')?.value || '';
  closeModal();
  mostrarActionSpinner(true);

  try {
    let movimientos = await getMovimientos();
    if (tipoFiltro !== 'todos') {
      movimientos = movimientos.filter(m => m.tipo === tipoFiltro);
    }
    if (desde) {
      movimientos = movimientos.filter(m => (m.fechaHora || '').slice(0, 7) >= desde);
    }
    if (hasta) {
      movimientos = movimientos.filter(m => (m.fechaHora || '').slice(0, 7) <= hasta);
    }

    if (movimientos.length === 0) {
      mostrarAlerta('No hay movimientos para ese filtro y periodo.', 'error');
      return;
    }

    const tipoLabelMap = { todos: 'Todos los movimientos', venta: 'Ventas', reposicion: 'Reposiciones de stock' };
    let tituloTipo = tipoLabelMap[tipoFiltro] || tipoFiltro;
    let periodoLabel = 'periodo-completo';
    if (desde || hasta) {
      const desdeTxt = desde ? mesLabel(desde) : 'inicio';
      const hastaTxt = hasta ? mesLabel(hasta) : 'hoy';
      tituloTipo += ` (${desdeTxt} — ${hastaTxt})`;
      periodoLabel = `${desde || 'inicio'}_a_${hasta || 'hoy'}`;
    }

    if (formato === 'pdf') {
      descargarReporteMovimientosPDF(movimientos, tituloTipo, tipoFiltro, periodoLabel);
    } else if (formato === 'excel') {
      descargarReporteMovimientosExcel(movimientos, tituloTipo, tipoFiltro, periodoLabel);
    } else {
      descargarReporteMovimientosCSV(movimientos, tituloTipo, tipoFiltro, periodoLabel);
    }
    mostrarAlerta('Reporte descargado correctamente.', 'success');
  } catch (err) {
    console.error(err);
    mostrarAlerta('Error al generar el reporte. Verifica la consola.', 'error');
  } finally {
    mostrarActionSpinner(false);
  }
}

function descargarReporteMovimientosExcel(movimientos, tituloTipo, tipoFiltro, periodoLabel) {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Fecha y hora', 'Tipo', 'Producto', 'Descripción', 'Costo productos', 'Costo envío', 'Otros costos', 'Total COP', 'Cantidad'],
    ...movimientos.map(m => [
      fmt.fechaHora(m.fechaHora), tipoMovLabel(m.tipo), m.productoNombre || '', m.descripcion || '',
      Math.round(m.costoProductos || 0), Math.round(m.costoEnvio || 0), Math.round(m.otrosCostos || 0),
      Math.round(m.totalCOP || 0), m.cantidad || 0
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `centris_movimientos_${tipoFiltro}_${periodoLabel}_${fecha}.xlsx`);
}

function descargarReporteMovimientosPDF(movimientos, tituloTipo, tipoFiltro, periodoLabel) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = 297;
  const ML = 10, MR = 10;
  const TW = PW - ML - MR;
  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('CENTRIS INVERSIONES', ML + 4, 12);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Reporte de movimientos — ${tituloTipo}`, ML + 4, 21);
  doc.text(fecha, PW - MR - 4, 21, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: 38,
    head: [['Fecha y hora', 'Tipo', 'Producto', 'Descripción', 'Costo productos', 'Costo envío', 'Otros costos', 'Total COP', 'Cant.']],
    body: movimientos.map(m => [
      fmt.fechaHora(m.fechaHora), tipoMovLabel(m.tipo), m.productoNombre || '—', m.descripcion || '—',
      copFmt(m.costoProductos || 0), copFmt(m.costoEnvio || 0), copFmt(m.otrosCostos || 0),
      copFmt(m.totalCOP || 0), m.cantidad || '—'
    ]),
    tableWidth: TW,
    margin: { left: ML, right: MR },
    styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center', valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 55 },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 16, halign: 'center' },
    },
  });

  const totalPags = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPags; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(`Centris Inversiones  \u00b7  Generado el ${fecha}  \u00b7  Pag. ${i} de ${totalPags}`, PW / 2, 206, { align: 'center' });
  }

  const fechaISO = new Date().toISOString().slice(0, 10);
  doc.save(`centris_movimientos_${tipoFiltro}_${periodoLabel}_${fechaISO}.pdf`);
}

function descargarReporteMovimientosCSV(movimientos, tituloTipo, tipoFiltro, periodoLabel) {
  const sep = ';';
  const headers = ['Fecha y hora', 'Tipo', 'Producto', 'Descripcion', 'Costo productos', 'Costo envio', 'Otros costos', 'Total COP', 'Cantidad'];
  let csv = headers.join(sep) + '\n';
  csv += movimientos.map(m => [
    fmt.fechaHora(m.fechaHora), tipoMovLabel(m.tipo), m.productoNombre || '', (m.descripcion || '').replace(/;/g, ','),
    Math.round(m.costoProductos || 0), Math.round(m.costoEnvio || 0), Math.round(m.otrosCostos || 0),
    Math.round(m.totalCOP || 0), m.cantidad || 0
  ].join(sep)).join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `centris_movimientos_${tipoFiltro}_${periodoLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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