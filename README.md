# 📦 Centris Inversiones — Control de productos

App administrativa para controlar inversiones en productos importados.

## 🚀 Cómo usar

1. Abre `index.html` directamente en tu navegador (no necesita servidor).
2. Los datos de demo se cargan automáticamente la primera vez.
3. Todo se guarda en `localStorage` del navegador.

## 📁 Estructura

```
centris-inversiones/
├── index.html      → Estructura HTML, sidebar, header, scripts
├── style.css       → Estilos completos (variables, componentes, responsive)
├── storage.js      → Capa de datos — REEMPLAZAR por Firebase aquí
├── productos.js    → Cálculos: inversión, costo unitario, ganancia, reportes
├── ui.js           → Renderizado de vistas: dashboard, listado, detalle, modales
└── app.js          → Router, eventos globales, validaciones
```

## 🔥 Migración a Firebase

### Paso 1 — Agregar Firebase al index.html
```html
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-storage-compat.js"></script>
```

### Paso 2 — Reemplazar solo storage.js
Cambia las funciones por sus equivalentes de Firestore:

```javascript
// ANTES (localStorage)
function getProductos() {
  return JSON.parse(localStorage.getItem('centris_productos') || '[]');
}

// DESPUÉS (Firebase)
async function getProductos() {
  const snapshot = await db.collection('productos').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Paso 3 — Hacer app.js async
Las funciones que usan datos deberán ser async/await.

### Colecciones Firestore sugeridas:
- `productos` → documentos por id
- `ventas` → documentos por id, con campo `productoId`
- `config` → documento único `config/global`

### Firebase Storage para imágenes:
```javascript
async function subirImagen(file, productoId) {
  const ref = storage.ref(`productos/${productoId}`);
  await ref.put(file);
  return await ref.getDownloadURL();
}
```

## 📊 Fórmulas de cálculo

```
inversión_total = (precioUSD × tasaDolar × cantidad) + envío + otrosCostos
costo_unitario  = inversión_total / cantidad
total_recuperado = Σ (venta.cantidad × venta.precioUnitario)
stock_actual    = cantidad_comprada - Σ venta.cantidad
ganancia        = total_recuperado - (costo_unitario × unidades_vendidas)
recuperación%   = (total_recuperado / inversión_total) × 100
```

## 🔮 Mejoras futuras

- [ ] Firebase Auth (login de usuarios)
- [ ] Firebase Storage para imágenes reales
- [ ] Exportar reportes a Excel (SheetJS)
- [ ] Exportar reportes a PDF (jsPDF)
- [ ] Alertas automáticas de stock bajo (email/WhatsApp)
- [ ] Historial de cambios por producto
- [ ] Filtros avanzados por rango de fechas
- [ ] Gráficas de ventas con Chart.js
- [ ] Múltiples usuarios/roles
- [ ] PWA (funciona offline)
