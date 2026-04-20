/**
 * PRODUCTOS.JS — Lógica de productos v2.1
 * Actualizado: ultimasVentas ahora incluye ganancia y datos del cliente
 */

// ─── CÁLCULOS ─────────────────────────────────────────────────────────────

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
    inversionTotal,
    costoUnitario,
    unidadesVendidas,
    totalRecuperado,
    stockActual,
    ganancia,
    recuperacionPct,
    estadoStock,
    numVentas: ventasProducto.length,
    ventas: ventasProducto,
  };
}

async function getProductosEnriquecidos() {
  const productos = await getProductos();
  const ventas = await getVentas();
  return productos.map(p => enriquecerProducto(p, ventas));
}

async function getProductoEnriquecido(id) {
  const p = await getProductoById(id);
  if (!p) return null;
  const ventas = await getVentasByProducto(id);
  return enriquecerProducto(p, ventas);
}

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────

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

// ─── RESUMEN GLOBAL ───────────────────────────────────────────────────────

async function calcularResumenGlobal() {
  const productos = await getProductosEnriquecidos();
  const ventas = await getVentas();

  const totalInvertido = productos.reduce((s, p) => s + p.inversionTotal, 0);
  const totalRecuperado = productos.reduce((s, p) => s + p.totalRecuperado, 0);
  const gananciaTotal = productos.reduce((s, p) => s + p.ganancia, 0);
  const totalProductos = productos.length;
  const unidadesTotalesStock = productos.reduce((s, p) => s + p.stockActual, 0);
  const unidadesTotalesVendidas = productos.reduce((s, p) => s + p.unidadesVendidas, 0);
  const productosStockBajo = productos.filter(p => p.estadoStock === 'bajo' || p.estadoStock === 'agotado');

  // Últimas ventas con producto, nombre, telefono, ganancia
  const ultimasVentas = [...ventas]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .map(v => {
      const prod = productos.find(p => p.id === v.productoId) || null;
      const gananciaVenta = prod ? (v.precioUnitario - prod.costoUnitario) * v.cantidad : 0;
      return {
        ...v,
        producto: prod,
        gananciaVenta,
      };
    });

  return {
    totalInvertido,
    totalRecuperado,
    gananciaTotal,
    totalProductos,
    unidadesTotalesStock,
    unidadesTotalesVendidas,
    productosStockBajo,
    ultimasVentas,
  };
}

// ─── REPORTES ─────────────────────────────────────────────────────────────

async function getReportes() {
  const productos = await getProductosEnriquecidos();
  const ventas = await getVentas();

  const categorias = {};
  productos.forEach(p => {
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
    mayorInversion: [...productos].sort((a, b) => b.inversionTotal - a.inversionTotal).slice(0, 10),
    mayorGanancia: [...productos].sort((a, b) => b.ganancia - a.ganancia).slice(0, 10),
    menosMovimiento: [...productos].sort((a, b) => a.numVentas - b.numVentas).slice(0, 10),
    agotados: productos.filter(p => p.estadoStock === 'agotado'),
    conStock: productos.filter(p => p.stockActual > 0),
    categorias: Object.values(categorias).sort((a, b) => b.inversion - a.inversion),
    meses: Object.values(meses).sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 12),
  };
}