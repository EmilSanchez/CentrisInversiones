/**
 * STORAGE.JS — Capa de datos
 * Actualmente usa localStorage.
 * Para migrar a Firebase: reemplaza solo las funciones de este archivo.
 * El resto de la app no necesita cambios.
 */

const KEYS = {
  PRODUCTOS: 'centris_productos',
  VENTAS: 'centris_ventas',
  CONFIG: 'centris_config',
};

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

function getProductos() {
  return JSON.parse(localStorage.getItem(KEYS.PRODUCTOS) || '[]');
}

function saveProductos(productos) {
  localStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productos));
}

function addProducto(producto) {
  const lista = getProductos();
  producto.id = generarId();
  producto.creadoEn = new Date().toISOString();
  lista.push(producto);
  saveProductos(lista);
  return producto;
}

function updateProducto(id, datos) {
  const lista = getProductos();
  const idx = lista.findIndex(p => p.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...datos, actualizadoEn: new Date().toISOString() };
  saveProductos(lista);
  return lista[idx];
}

function deleteProducto(id) {
  const lista = getProductos().filter(p => p.id !== id);
  saveProductos(lista);
  // También eliminar ventas del producto
  const ventas = getVentas().filter(v => v.productoId !== id);
  saveVentas(ventas);
}

function getProductoById(id) {
  return getProductos().find(p => p.id === id) || null;
}

// ─── VENTAS ───────────────────────────────────────────────────────────────────

function getVentas() {
  return JSON.parse(localStorage.getItem(KEYS.VENTAS) || '[]');
}

function saveVentas(ventas) {
  localStorage.setItem(KEYS.VENTAS, JSON.stringify(ventas));
}

function addVenta(venta) {
  const lista = getVentas();
  venta.id = generarId();
  venta.creadoEn = new Date().toISOString();
  lista.push(venta);
  saveVentas(lista);
  return venta;
}

function getVentasByProducto(productoId) {
  return getVentas().filter(v => v.productoId === productoId);
}

function deleteVenta(id) {
  const lista = getVentas().filter(v => v.id !== id);
  saveVentas(lista);
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

function getConfig() {
  return JSON.parse(localStorage.getItem(KEYS.CONFIG) || '{"tasaDolar":4000,"moneda":"COP"}');
}

function saveConfig(config) {
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}

// ─── UTIL ─────────────────────────────────────────────────────────────────────

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── DATOS DEMO ───────────────────────────────────────────────────────────────

function cargarDatosDemo() {
  if (getProductos().length > 0) return;

  const p1 = addProducto({
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

  const p2 = addProducto({
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

  const p3 = addProducto({
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

  // Ventas demo
  const hoy = new Date();
  const fecha = (diasAtras) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - diasAtras);
    return d.toISOString().split('T')[0];
  };

  addVenta({ productoId: p1.id, fecha: fecha(20), cantidad: 3, precioUnitario: 280000, cliente: 'Cliente A', obs: '' });
  addVenta({ productoId: p1.id, fecha: fecha(12), cantidad: 2, precioUnitario: 265000, cliente: 'Cliente B', obs: 'Descuento por cantidad' });
  addVenta({ productoId: p1.id, fecha: fecha(5), cantidad: 4, precioUnitario: 280000, cliente: 'Cliente C', obs: '' });
  addVenta({ productoId: p2.id, fecha: fecha(18), cantidad: 5, precioUnitario: 170000, cliente: 'Empresa XYZ', obs: 'Pedido corporativo' });
  addVenta({ productoId: p2.id, fecha: fecha(8), cantidad: 3, precioUnitario: 160000, cliente: '', obs: '' });
  addVenta({ productoId: p3.id, fecha: fecha(15), cantidad: 8, precioUnitario: 110000, cliente: '', obs: '' });
  addVenta({ productoId: p3.id, fecha: fecha(3), cantidad: 5, precioUnitario: 115000, cliente: 'Distribuidora Norte', obs: '' });
}
