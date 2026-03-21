/**
 * PRODUCTOS.JS — Lógica de productos (versión async/Firebase)
 * Todos los cálculos son los mismos, pero las funciones que leen datos son async.
 */

// ─── CÁLCULOS (síncronos, no cambian) ────────────────────────────────────────

function calcularInversion(p) {
  return (p.precioUSD * p.tasaDolar * p.cantidad) + (p.envio || 0) + (p.otrosCostos || 0);
}

function calcularCostoUnitario(p) {
  if (!p.cantidad || p.cantidad === 0) return 0;
  return calcularInversion(p) / p.cantidad;
}

function enriquecerProducto(producto, ventas) {
  const ventasProducto = ventas.filter(v => v.productoId === producto.id);
  const inversionTotal = calcularInversion(producto);
  const costoUnitario = calcularCostoUnitario(producto);
  const unidadesVendidas = ventasProducto.reduce((s, v) => s + (v.cantidad || 0), 0);
  const totalRecuperado = ventasProducto.reduce((s, v) => s + ((v.cantidad || 0) * (v.precioUnitario || 0)), 0);
  const stockActual = (producto.cantidad || 0) - unidadesVendidas;
  const costoVendido = costoUnitario * unidadesVendidas;
  const ganancia = totalRecuperado - costoVendido;
  const recuperacionPct = inversionTotal > 0 ? (totalRecuperado / inversionTotal) * 100 : 0;

  let estadoStock = 'ok';
  if (stockActual === 0) estadoStock = 'agotado';
  else if (stockActual <= Math.ceil(producto.cantidad * 0.2)) estadoStock = 'bajo';

  return {
    ...producto,
    inversionTotal, costoUnitario, unidadesVendidas, totalRecuperado,
    stockActual, ganancia, recuperacionPct, estadoStock,
    numVentas: ventasProducto.length,
    ventas: ventasProducto,
  };
}

// ─── ASYNC: funciones que consultan Firebase ──────────────────────────────────

async function getProductosEnriquecidos() {
  const [productos, ventas] = await Promise.all([getProductos(), getVentas()]);
  return productos.map(p => enriquecerProducto(p, ventas));
}

async function getProductoEnriquecido(id) {
  const [p, ventas] = await Promise.all([getProductoById(id), getVentasByProducto(id)]);
  if (!p) return null;
  return enriquecerProducto(p, ventas);
}

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────────

function validarProducto(datos) {
  const errores = [];
  if (!datos.nombre?.trim()) errores.push('El nombre es obligatorio.');
  if (!datos.sku?.trim()) errores.push('El SKU es obligatorio.');
  if (!datos.precioUSD || datos.precioUSD <= 0) errores.push('El precio en USD debe ser mayor a 0.');
  if (!datos.tasaDolar || datos.tasaDolar <= 0) errores.push('La tasa del dólar debe ser mayor a 0.');
  if (!datos.cantidad || datos.cantidad <= 0) errores.push('La cantidad debe ser mayor a 0.');
  return errores;
}

function validarVenta(datos, stockDisponible) {
  const errores = [];
  if (!datos.fecha) errores.push('La fecha es obligatoria.');
  if (!datos.cantidad || datos.cantidad <= 0) errores.push('La cantidad debe ser mayor a 0.');
  if (datos.cantidad > stockDisponible) errores.push(`Stock insuficiente. Disponible: ${stockDisponible} unidades.`);
  if (!datos.precioUnitario || datos.precioUnitario <= 0) errores.push('El precio de venta debe ser mayor a 0.');
  return errores;
}

// ─── RESUMEN GLOBAL ───────────────────────────────────────────────────────────

async function calcularResumenGlobal() {
  const [productos, ventas] = await Promise.all([getProductos(), getVentas()]);
  const productosE = productos.map(p => enriquecerProducto(p, ventas));

  const totalInvertido = productosE.reduce((s, p) => s + p.inversionTotal, 0);
  const totalRecuperado = productosE.reduce((s, p) => s + p.totalRecuperado, 0);
  const gananciaTotal = productosE.reduce((s, p) => s + p.ganancia, 0);
  const unidadesTotalesStock = productosE.reduce((s, p) => s + p.stockActual, 0);
  const unidadesTotalesVendidas = productosE.reduce((s, p) => s + p.unidadesVendidas, 0);
  const productosStockBajo = productosE.filter(p => p.estadoStock === 'bajo' || p.estadoStock === 'agotado');

  const ultimasVentas = [...ventas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 8)
    .map(v => ({ ...v, producto: productos.find(p => p.id === v.productoId) }));

  return {
    totalInvertido, totalRecuperado, gananciaTotal,
    totalProductos: productosE.length,
    unidadesTotalesStock, unidadesTotalesVendidas,
    productosStockBajo, ultimasVentas,
  };
}

// ─── REPORTES ─────────────────────────────────────────────────────────────────

async function getReportes() {
  const [productos, ventas] = await Promise.all([getProductos(), getVentas()]);
  const productosE = productos.map(p => enriquecerProducto(p, ventas));

  const categorias = {};
  productosE.forEach(p => {
    const cat = p.categoria || 'Sin categoría';
    if (!categorias[cat]) categorias[cat] = { nombre: cat, inversion: 0, recuperado: 0, ganancia: 0, productos: 0 };
    categorias[cat].inversion += p.inversionTotal;
    categorias[cat].recuperado += p.totalRecuperado;
    categorias[cat].ganancia += p.ganancia;
    categorias[cat].productos++;
  });

  const meses = {};
  ventas.forEach(v => {
    const mes = v.fecha?.slice(0, 7) || 'sin-fecha';
    if (!meses[mes]) meses[mes] = { mes, total: 0, unidades: 0, numVentas: 0 };
    meses[mes].total += (v.cantidad || 0) * (v.precioUnitario || 0);
    meses[mes].unidades += v.cantidad || 0;
    meses[mes].numVentas++;
  });

  return {
    mayorInversion: [...productosE].sort((a, b) => b.inversionTotal - a.inversionTotal).slice(0, 10),
    mayorGanancia: [...productosE].sort((a, b) => b.ganancia - a.ganancia).slice(0, 10),
    menosMovimiento: [...productosE].sort((a, b) => a.numVentas - b.numVentas).slice(0, 10),
    agotados: productosE.filter(p => p.estadoStock === 'agotado'),
    conStock: productosE.filter(p => p.stockActual > 0),
    categorias: Object.values(categorias).sort((a, b) => b.inversion - a.inversion),
    meses: Object.values(meses).sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 12),
  };
}