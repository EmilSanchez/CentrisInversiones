/**
 * STORAGE.JS — Capa de datos con Firebase Firestore
 * v2.1 — Añadido: colección movimientos para registro de inversiones/reposiciones/envíos
 */

// ─── CACHÉ LOCAL ─────────────────────────────────────────────────────────

let _cache = {
  productos: null,
  ventas: null,
  config: null,
  movimientos: null,
};

function limpiarCache() {
  _cache = { productos: null, ventas: null, config: null, movimientos: null };
}

// ─── PRODUCTOS ────────────────────────────────────────────────────────────

async function getProductos() {
  if (_cache.productos) return _cache.productos;
  const snap = await db.collection('productos').orderBy('creadoEn', 'desc').get();
  _cache.productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _cache.productos;
}

async function addProducto(producto) {
  producto.creadoEn = new Date().toISOString();
  const ref = await db.collection('productos').add(producto);
  producto.id = ref.id;
  _cache.productos = null;
  return producto;
}

async function updateProducto(id, datos) {
  datos.actualizadoEn = new Date().toISOString();
  await db.collection('productos').doc(id).update(datos);
  _cache.productos = null;
  return { id, ...datos };
}

async function deleteProducto(id) {
  await db.collection('productos').doc(id).delete();
  const snapV = await db.collection('ventas').where('productoId', '==', id).get();
  const batch1 = db.batch();
  snapV.docs.forEach(d => batch1.delete(d.ref));
  await batch1.commit();
  const snapM = await db.collection('movimientos').where('productoId', '==', id).get();
  const batch2 = db.batch();
  snapM.docs.forEach(d => batch2.delete(d.ref));
  await batch2.commit();
  _cache.productos = null;
  _cache.ventas = null;
  _cache.movimientos = null;
}

async function getProductoById(id) {
  const doc = await db.collection('productos').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// ─── VENTAS ───────────────────────────────────────────────────────────────

async function getVentas() {
  if (_cache.ventas) return _cache.ventas;
  const snap = await db.collection('ventas').orderBy('creadoEn', 'desc').get();
  _cache.ventas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _cache.ventas;
}

async function addVenta(venta) {
  venta.creadoEn = new Date().toISOString();
  const ref = await db.collection('ventas').add(venta);
  venta.id = ref.id;
  _cache.ventas = null;
  return venta;
}

async function getVentasByProducto(productoId) {
  const snap = await db.collection('ventas').where('productoId', '==', productoId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function deleteVenta(id) {
  await db.collection('ventas').doc(id).delete();
  _cache.ventas = null;
}

// ─── MOVIMIENTOS ──────────────────────────────────────────────────────────
// Registra: inversiones iniciales, reposiciones, costos de envío, etc.

async function getMovimientos() {
  if (_cache.movimientos) return _cache.movimientos;
  const snap = await db.collection('movimientos').orderBy('fechaHora', 'desc').get();
  _cache.movimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _cache.movimientos;
}

async function addMovimiento(mov) {
  mov.fechaHora = new Date().toISOString();
  const ref = await db.collection('movimientos').add(mov);
  mov.id = ref.id;
  _cache.movimientos = null;
  return mov;
}

async function deleteMovimiento(id) {
  await db.collection('movimientos').doc(id).delete();
  _cache.movimientos = null;
}

// ─── CONFIG ───────────────────────────────────────────────────────────────

async function getConfig() {
  if (_cache.config) return _cache.config;
  const doc = await db.collection('config').doc('general').get();
  if (!doc.exists) {
    _cache.config = { tasaDolar: 4000, moneda: 'COP' };
  } else {
    _cache.config = doc.data();
  }
  return _cache.config;
}

async function saveConfig(config) {
  await db.collection('config').doc('general').set(config);
  _cache.config = null;
}

// ─── UTIL ─────────────────────────────────────────────────────────────────

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── DATOS DEMO ───────────────────────────────────────────────────────────

async function cargarDatosDemo() {
  const productos = await getProductos();
  if (productos.length > 0) return;

  const p1 = await addProducto({
    sku: 'AMZ-001',
    nombre: 'Auriculares Bluetooth Pro',
    descripcion: 'Auriculares inalámbricos con cancelación de ruido',
    categoria: 'Electrónica',
    proveedor: 'Amazon USA',
    link: 'https://amazon.com',
    imagen: '',
    precioUSD: 45,
    tasaDolar: 4050,
    cantidad: 20,
    envio: 80000,
    otrosCostos: 15000,
    precioSugerido: 280000,
    estado: 'activo',
  });

  const p2 = await addProducto({
    sku: 'AMZ-002',
    nombre: 'Mouse Ergonómico Inalámbrico',
    descripcion: 'Mouse vertical ergonómico para oficina',
    categoria: 'Computación',
    proveedor: 'Amazon USA',
    link: 'https://amazon.com',
    imagen: '',
    precioUSD: 28,
    tasaDolar: 4050,
    cantidad: 15,
    envio: 60000,
    otrosCostos: 10000,
    precioSugerido: 170000,
    estado: 'activo',
  });

  const p3 = await addProducto({
    sku: 'AMZ-003',
    nombre: 'Soporte para Laptop Aluminio',
    descripcion: 'Soporte plegable de aluminio para portátil',
    categoria: 'Accesorios',
    proveedor: 'AliExpress',
    link: '',
    imagen: '',
    precioUSD: 18,
    tasaDolar: 4050,
    cantidad: 30,
    envio: 45000,
    otrosCostos: 5000,
    precioSugerido: 110000,
    estado: 'activo',
  });

  const hoy = new Date();
  const fecha = (diasAtras) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - diasAtras);
    return d.toISOString().split('T')[0];
  };

  await addVenta({ productoId: p1.id, fecha: fecha(20), cantidad: 3, precioUnitario: 280000, cliente: 'Cliente A', telefono: '3001234567', obs: '' });
  await addVenta({ productoId: p1.id, fecha: fecha(12), cantidad: 2, precioUnitario: 265000, cliente: 'Cliente B', telefono: '3009876543', obs: 'Descuento por cantidad' });
  await addVenta({ productoId: p1.id, fecha: fecha(5),  cantidad: 4, precioUnitario: 280000, cliente: 'Cliente C', telefono: '3005551234', obs: '' });
  await addVenta({ productoId: p2.id, fecha: fecha(18), cantidad: 5, precioUnitario: 170000, cliente: 'Empresa XYZ', telefono: '3004445566', obs: 'Pedido corporativo' });
  await addVenta({ productoId: p2.id, fecha: fecha(8),  cantidad: 3, precioUnitario: 160000, cliente: '', telefono: '', obs: '' });
  await addVenta({ productoId: p3.id, fecha: fecha(15), cantidad: 8, precioUnitario: 110000, cliente: '', telefono: '', obs: '' });
  await addVenta({ productoId: p3.id, fecha: fecha(3),  cantidad: 5, precioUnitario: 115000, cliente: 'Distribuidora Norte', telefono: '3007778899', obs: '' });

  // Movimientos demo
  await addMovimiento({ tipo: 'inversion', productoId: p1.id, productoNombre: p1.nombre, descripcion: 'Inversión inicial - 20 uds Auriculares', costoProductos: p1.precioUSD * p1.tasaDolar * p1.cantidad, costoEnvio: 80000, otrosCostos: 15000, totalCOP: (p1.precioUSD * p1.tasaDolar * p1.cantidad) + 80000 + 15000, cantidad: 20 });
  await addMovimiento({ tipo: 'inversion', productoId: p2.id, productoNombre: p2.nombre, descripcion: 'Inversión inicial - 15 uds Mouse', costoProductos: p2.precioUSD * p2.tasaDolar * p2.cantidad, costoEnvio: 60000, otrosCostos: 10000, totalCOP: (p2.precioUSD * p2.tasaDolar * p2.cantidad) + 60000 + 10000, cantidad: 15 });
  await addMovimiento({ tipo: 'inversion', productoId: p3.id, productoNombre: p3.nombre, descripcion: 'Inversión inicial - 30 uds Soporte', costoProductos: p3.precioUSD * p3.tasaDolar * p3.cantidad, costoEnvio: 45000, otrosCostos: 5000, totalCOP: (p3.precioUSD * p3.tasaDolar * p3.cantidad) + 45000 + 5000, cantidad: 30 });
}
