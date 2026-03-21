/**
 * STORAGE-FIREBASE.JS — Capa de datos con Firebase Firestore
 *
 * INSTRUCCIONES:
 * 1. Asegúrate de tener firebase-config.js cargado ANTES en index.html
 * 2. Renombra este archivo a storage.js (reemplaza el anterior)
 * 3. Las funciones son async — app.js ya las maneja correctamente
 *
 * Colecciones usadas:
 *   - productos
 *   - ventas
 *   - config/global (documento único)
 */

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

async function getProductos() {
  const snapshot = await db.collection('productos').orderBy('creadoEn', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getProductoById(id) {
  const doc = await db.collection('productos').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function addProducto(producto) {
  producto.creadoEn = new Date().toISOString();
  const ref = await db.collection('productos').add(producto);
  return { id: ref.id, ...producto };
}

async function updateProducto(id, datos) {
  datos.actualizadoEn = new Date().toISOString();
  await db.collection('productos').doc(id).update(datos);
  return { id, ...datos };
}

async function deleteProducto(id) {
  await db.collection('productos').doc(id).delete();
  // Eliminar ventas asociadas
  const ventas = await db.collection('ventas').where('productoId', '==', id).get();
  const batch = db.batch();
  ventas.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

async function getVentas() {
  const snapshot = await db.collection('ventas').orderBy('fecha', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getVentasByProducto(productoId) {
  const snapshot = await db.collection('ventas')
    .where('productoId', '==', productoId)
    .orderBy('fecha', 'desc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addVenta(venta) {
  venta.creadoEn = new Date().toISOString();
  const ref = await db.collection('ventas').add(venta);
  return { id: ref.id, ...venta };
}

async function deleteVenta(id) {
  await db.collection('ventas').doc(id).delete();
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

async function getConfig() {
  const doc = await db.collection('config').doc('global').get();
  if (!doc.exists) return { tasaDolar: 4000, moneda: 'COP' };
  return doc.data();
}

async function saveConfig(config) {
  await db.collection('config').doc('global').set(config, { merge: true });
}

// ─── UTIL ─────────────────────────────────────────────────────────────────────

function generarId() {
  // Con Firebase el id lo genera Firestore automáticamente.
  // Esta función se mantiene por compatibilidad pero no se usa en producción.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── DATOS DEMO (solo usar una vez para poblar Firebase) ─────────────────────

async function cargarDatosDemo() {
  const existentes = await getProductos();
  if (existentes.length > 0) return; // Ya hay datos, no duplicar

  const p1 = await addProducto({
    sku: 'AMZ-001', nombre: 'Auriculares Bluetooth Pro',
    descripcion: 'Auriculares inalámbricos con cancelación de ruido',
    categoria: 'Electrónica', proveedor: 'Amazon USA', link: 'https://amazon.com', imagen: '',
    precioUSD: 45, tasaDolar: 4050, cantidad: 20, envio: 80000, otrosCostos: 15000,
    precioSugerido: 280000, estado: 'activo',
  });

  const p2 = await addProducto({
    sku: 'AMZ-002', nombre: 'Mouse Ergonómico Inalámbrico',
    descripcion: 'Mouse vertical ergonómico para oficina',
    categoria: 'Computación', proveedor: 'Amazon USA', link: '', imagen: '',
    precioUSD: 28, tasaDolar: 4050, cantidad: 15, envio: 60000, otrosCostos: 10000,
    precioSugerido: 170000, estado: 'activo',
  });

  const hoy = new Date();
  const fecha = (d) => { const f = new Date(hoy); f.setDate(f.getDate()-d); return f.toISOString().split('T')[0]; };

  await addVenta({ productoId: p1.id, fecha: fecha(10), cantidad: 3, precioUnitario: 280000, cliente: 'Cliente A', obs: '' });
  await addVenta({ productoId: p1.id, fecha: fecha(5),  cantidad: 2, precioUnitario: 265000, cliente: 'Cliente B', obs: '' });
  await addVenta({ productoId: p2.id, fecha: fecha(8),  cantidad: 4, precioUnitario: 170000, cliente: 'Empresa XYZ', obs: '' });

  console.log('✅ Datos demo cargados en Firebase');
}