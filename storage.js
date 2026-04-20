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
  // Generar ID de venta legible (V-0001, V-0002...)
  if (!venta.ventaId) {
    const snap = await db.collection('ventas').orderBy('creadoEn', 'desc').limit(1).get();
    let nextNum = 1;
    if (!snap.empty) {
      const lastVentaId = snap.docs[0].data().ventaId || '';
      const match = lastVentaId.match(/V-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    venta.ventaId = `V-${String(nextNum).padStart(4, '0')}`;
  }
  const ref = await db.collection('ventas').add(venta);
  venta.id = ref.id;
  _cache.ventas = null;
  return venta;
}

async function getVentasByProducto(productoId) {
  const snap = await db.collection('ventas').where('productoId', '==', productoId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateVenta(id, datos) {
  datos.actualizadoEn = new Date().toISOString();
  await db.collection('ventas').doc(id).update(datos);
  _cache.ventas = null;
  return { id, ...datos };
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

async function updateMovimiento(id, datos) {
  datos.actualizadoEn = new Date().toISOString();
  datos.totalCOP = (datos.costoProductos || 0) + (datos.costoEnvio || 0) + (datos.otrosCostos || 0);
  await db.collection('movimientos').doc(id).update(datos);
  _cache.movimientos = null;
  return { id, ...datos };
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
