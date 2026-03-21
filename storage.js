/**
 * STORAGE.JS — Capa de datos con Firebase Firestore
 * Reemplaza completamente el storage.js anterior (localStorage).
 *
 * REQUISITO: firebase-config.js debe estar cargado antes en index.html
 * con: firebase.initializeApp(firebaseConfig) y const db = firebase.firestore();
 */

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

async function getProductos() {
  try {
    const snapshot = await db.collection('productos').orderBy('creadoEn', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('getProductos:', e);
    return [];
  }
}

async function getProductoById(id) {
  try {
    const doc = await db.collection('productos').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error('getProductoById:', e);
    return null;
  }
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
  const ventas = await db.collection('ventas').where('productoId', '==', id).get();
  const batch = db.batch();
  ventas.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

async function getVentas() {
  try {
    const snapshot = await db.collection('ventas').orderBy('fecha', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('getVentas:', e);
    return [];
  }
}

async function getVentasByProducto(productoId) {
  try {
    const snapshot = await db.collection('ventas')
      .where('productoId', '==', productoId)
      .orderBy('fecha', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('getVentasByProducto:', e);
    return [];
  }
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
  try {
    const doc = await db.collection('config').doc('global').get();
    if (!doc.exists) return { tasaDolar: 4000, moneda: 'COP' };
    return doc.data();
  } catch (e) {
    return { tasaDolar: 4000, moneda: 'COP' };
  }
}

async function saveConfig(config) {
  await db.collection('config').doc('global').set(config, { merge: true });
}

// ─── UTIL ─────────────────────────────────────────────────────────────────────

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── DATOS DEMO (se ejecuta solo si Firestore está vacío) ─────────────────────

async function cargarDatosDemo() {
  const existentes = await getProductos();
  if (existentes.length > 0) return;

  const p1 = await addProducto({
    sku: 'AMZ-001', nombre: 'Auriculares Bluetooth Pro',
    descripcion: 'Auriculares inalámbricos con cancelación de ruido',
    categoria: 'Electrónica', proveedor: 'Amazon USA',
    link: 'https://amazon.com', imagen: '',
    precioUSD: 45, tasaDolar: 4050, cantidad: 20,
    envio: 80000, otrosCostos: 15000, precioSugerido: 280000, estado: 'activo',
  });
  const p2 = await addProducto({
    sku: 'AMZ-002', nombre: 'Mouse Ergonómico Inalámbrico',
    descripcion: 'Mouse vertical ergonómico para oficina',
    categoria: 'Computación', proveedor: 'Amazon USA',
    link: '', imagen: '',
    precioUSD: 28, tasaDolar: 4050, cantidad: 15,
    envio: 60000, otrosCostos: 10000, precioSugerido: 170000, estado: 'activo',
  });

  const hoy = new Date();
  const fecha = (d) => { const f = new Date(hoy); f.setDate(f.getDate()-d); return f.toISOString().split('T')[0]; };
  await addVenta({ productoId: p1.id, fecha: fecha(10), cantidad: 3, precioUnitario: 280000, cliente: 'Cliente A', obs: '' });
  await addVenta({ productoId: p1.id, fecha: fecha(5),  cantidad: 2, precioUnitario: 265000, cliente: 'Cliente B', obs: '' });
  await addVenta({ productoId: p2.id, fecha: fecha(8),  cantidad: 4, precioUnitario: 170000, cliente: 'Empresa XYZ', obs: '' });
  console.log('✅ Datos demo cargados en Firebase');
}