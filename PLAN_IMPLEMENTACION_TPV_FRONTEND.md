# Plan de implementación frontend — TPV Maingoo

> Repositorio: `Maingoo-Front`
>
> Alcance: interfaz operativa del TPV, carta, mesas, cocina, caja, inventario y sincronización offline.
>
> Fecha de referencia: 24 de julio de 2026.
>
> Estado: plan ejecutable; este documento es autónomo y contiene los contratos backend que necesita el frontend.

## Estado de ejecución

| Fase | Estado |
|---|---|
| F0 — Contratos y navegación | Implementada (`5f54fdd`) |
| F1 — Bootstrap y configuración mínima | Implementada (`0a17ce2`) |
| F2 — Terminal online | Implementada (`e883c89`) |
| F3 — Cocina y caja | Implementada (`f7e9def`) |
| F4 — Inventario y margen | Implementada (`90c9b8b`) |
| F5 — Offline | Implementada (`803684b`) |
| F6 — Endurecimiento | Implementada |

## 1. Objetivo del frontend

Convertir la ruta existente `/ventas`, hoy marcada como sección en construcción, en un TPV usable en portátil y tablet que conecte:

```text
carta -> mesa/pedido -> cocina -> cobro -> ticket
                           |
                           v
                    stock y margen
```

El usuario no debe cambiar de aplicación para operar sala, cocina, caja o revisar el inventario derivado de las ventas.

## 2. Restricciones del repositorio

La implementación debe conservar la arquitectura existente:

- Angular 19 standalone.
- Tailwind CSS 3 y PrimeNG 19.
- `ngx-translate` para todo texto visible.
- `ngx-permissions` y `AppPermission` para rutas/acciones.
- `BaseHttpService` para HTTP.
- Signals/computed para estado local; RxJS para I/O.
- `takeUntilDestroyed` para suscripciones.
- Componentes compartidos actuales: shells, tabla, iconos, skeleton, empty state, toast, confirmación y modal.
- Service Worker Angular ya instalado; ampliar su uso, no sustituirlo.
- Tests Jasmine/Karma y build actual.

No introducir NgRx, Akita, Redux, Dexie, un segundo kit UI ni una capa genérica de repositorios. IndexedDB nativo cubre la cola offline.

## 3. Decisiones de UX cerradas

| Tema | Decisión |
|---|---|
| Ruta principal | Mantener `/ventas`; deja de ser placeholder. |
| Navegación | Rutas hijas lazy dentro de `ventas.routes.ts`. |
| Pantalla de venta | Diseñada primero para tablet horizontal/escritorio táctil. |
| Móvil | Solo consultas/acciones simples; no se promete un TPV completo cómodo en teléfono. |
| Shell operativo | El terminal y KDS pueden ocultar el sidebar global para maximizar superficie, con salida visible. |
| Estado | Un store feature-local con signals, no `LayoutService` ni estado global nuevo. |
| Actualización cocina/mesas | Polling incremental cada 2 s mientras la vista está visible. |
| Offline | Cola IndexedDB para comandos de venta; no cachear escrituras mediante Service Worker. |
| Conflictos | Nunca sobrescribir silenciosamente: mostrar versión servidor y permitir recargar/reaplicar. |
| Impresión inicial | Vista HTML/CSS de impresión y `window.print()`. |
| Caja | Exige sesión abierta antes de cobrar. |
| Fiscalidad | Frontend muestra estado; no calcula hash, número fiscal ni payload AEAT. |

El shell de tablet es una excepción deliberada al estado actual de responsive del producto: debe documentarse como patrón exclusivo de superficies operativas (`pos-terminal`, `kds`) y no convertirse en un rediseño móvil general.

## 4. Contrato funcional con backend

El frontend consumirá bajo `/api`:

```text
/pos/bootstrap
/pos/settings
/pos/devices
/pos/areas
/pos/tables
/pos/menu/categories
/pos/menu/items
/pos/orders
/pos/kitchen/tickets
/pos/cash-sessions
/pos/fiscal-documents
/inventory/summary
/inventory/movements
/inventory/counts
```

Los comandos operativos POS envían:

- body DTO plano, nunca envuelto en `{ data }`;
- `deviceId` persistido localmente;
- `expectedVersion` para agregados existentes;
- `clientCreatedAt` ISO-8601;
- header `Idempotency-Key` con UUID v4 creado por el frontend.

`clientMutationId` solo existe como clave local de la cola y debe coincidir con
`Idempotency-Key` al enviar/reintentar. No se incluye en el body porque el Gateway
usa `forbidNonWhitelisted`. Las mutaciones de configuración no usan ese header. El
movimiento manual de inventario es la excepción: lleva `idempotencyKey` dentro del
body porque así lo define `/api/inventory/movements`.

Para usuarios tenant se omite `enterpriseId`; el backend usa la empresa autenticada.
Un usuario `admin.super` debe enviarlo explícitamente.

Importes llegan y salen como cadenas decimales (`"12.50"`). El frontend puede formatearlos para UI, pero no decide totales finales ni impuestos.

Códigos de error que deben manejarse por `code`, no por texto:

```text
POS_DISABLED
DEVICE_NOT_REGISTERED
DEVICE_REVOKED
CASH_SESSION_REQUIRED
CASH_SESSION_ALREADY_OPEN
ORDER_VERSION_CONFLICT
ORDER_ALREADY_FINALIZED
PAYMENT_EXCEEDS_BALANCE
IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
MENU_ITEM_INACTIVE
RECIPE_REQUIRED
RECIPE_INVALID
FISCAL_CONFIGURATION_INCOMPLETE
```

También deben contemplarse, entre otros, `INVALID_IDEMPOTENCY_KEY`,
`INVALID_SYNC_CURSOR`, `MISSING_PERMISSION`, `POS_DEVICE_NOT_FOUND`,
`ORDER_NOT_FOUND`, `ORDER_NOT_FULLY_PAID`, `ORDER_CLOSED`,
`OPEN_CASH_SESSION_NOT_FOUND`, `KITCHEN_TICKET_STATE_CONFLICT`,
`STOCK_UNIT_MISMATCH` y `STOCK_CHANGED_DURING_COUNT`. Los errores de validación
pueden no incluir `code` y devolver `message` como `string[]`.

`STOCK_SYNC_PENDING` y `FISCAL_SUBMISSION_REJECTED` no son códigos de error del
Gateway: la UI deriva esos estados de `StockSyncJob.status` y
`FiscalRecord.submissionStatus`.

## 5. Rutas y permisos

Sustituir la ruta simple actual en `src/app/app.routes.ts` por:

```ts
{
  path: 'ventas',
  loadChildren: () => import('./features/ventas/ventas.routes'),
  canActivate: [ngxPermissionsGuard],
  data: { permissions: { only: [AppPermission.PosRead] } }
}
```

Crear `src/app/features/ventas/ventas.routes.ts`:

| Ruta | Vista | Permiso |
|---|---|---|
| `/ventas` | landing TPV con accesos permitidos | `pos.read` |
| `/ventas/terminal` | sala y venta | `pos.sell` |
| `/ventas/cocina` | KDS | `pos.kitchen` |
| `/ventas/caja` | apertura, movimientos y cierre | `pos.cash` |
| `/ventas/historial` | pedidos/tickets | `pos.read` |
| `/ventas/configuracion` | carta, mesas, dispositivos | `pos.manage` |
| `/ventas/informes` | resumen ventas/margen | `reports.sales.read` |
| `/inventario` | existencias, movimientos, recuentos | `inventory.read` |

`/inventario` debe ser feature propia porque ya existe el concepto “Almacén” en sidebar y no es exclusivo de ventas. Puede sustituir gradualmente la vista de productos o entrar como hijo de `/productos`; elegir una sola ubicación visible para evitar dos menús con el mismo propósito. La decisión recomendada es mantener `/productos` para catálogo y añadir `/inventario` para existencias.

Añadir a `src/app/core/constants/permissions.enum.ts`:

```ts
PosRead = 'pos.read'
PosSell = 'pos.sell'
PosVoid = 'pos.void'
PosRefund = 'pos.refund'
PosCash = 'pos.cash'
PosKitchen = 'pos.kitchen'
PosManage = 'pos.manage'
InventoryRead = 'inventory.read'
InventoryWrite = 'inventory.write'
SalesReportsRead = 'reports.sales.read'
FiscalRead = 'fiscal.read'
FiscalWrite = 'fiscal.write'
```

Actualizar `src/app/layout/component/sidebar/app.sidebar.ts`:

- reactivar `Ventas`, sin `comingSoon`, con `AppPermission.PosRead`;
- añadir `Inventario` si el usuario posee `InventoryRead`;
- no duplicar “Almacén” e “Inventario” con significado ambiguo: renombrar el enlace actual a `Productos` si apunta al catálogo.

## 6. Estructura de feature

Estructura objetivo; no crear archivos vacíos ni componentes sin uso:

```text
src/app/features/ventas/
  ventas.routes.ts
  models/
    pos.models.ts
    pos-command.models.ts
  services/
    pos.service.ts
    pos-session.store.ts
    pos-offline-queue.service.ts
    pos-sync.service.ts
    receipt-print.service.ts
  pages/
    terminal/pos-terminal.component.{ts,html}
    kitchen/kitchen-display.component.{ts,html}
    cash/cash-management.component.{ts,html}
    history/sales-history.component.{ts,html}
    settings/pos-settings.component.{ts,html}
    reports/sales-reports.component.{ts,html}
  components/
    pos-operation-shell/
    sync-status/
    category-tabs/
    menu-grid/
    menu-item-card/
    table-map/
    order-panel/
    order-line/
    modifier-dialog/
    payment-dialog/
    split-payment-dialog/
    cash-open-dialog/
    cash-close-dialog/
    kitchen-ticket-card/
    order-status-badge/
    receipt-view/

src/app/features/inventory/
  inventory.routes.ts
  models/inventory.models.ts
  services/inventory.service.ts
  pages/stock-summary/
  pages/stock-movements/
  pages/stock-count/
  components/stock-adjustment-dialog/
```

No mover componentes a `shared` durante la primera implementación. Solo promoverlos si una segunda feature real los reutiliza.

## 7. Modelos TypeScript

Definir interfaces explícitas en `pos.models.ts`. No usar `any`.

### 7.1 Tipos base

```ts
export type DecimalString = string;
export type PosOrderStatus =
  | 'DRAFT' | 'OPEN' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type KitchenTicketStatus =
  | 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'OTHER';
export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'CONFLICT' | 'ERROR';
```

Interfaces mínimas:

- `PosBootstrapResponse`.
- `PosSettings`.
- `PosDevice`.
- `DiningArea`, `DiningTable`.
- `MenuCategory`, `MenuItem`, `ModifierGroup`, `ModifierOption`.
- `PosOrder`, `PosOrderLine`, `PosOrderLineModifier`.
- `KitchenTicket`, `KitchenTicketItem`.
- `CashSession`, `CashMovement`.
- `Payment`, `Refund`.
- `FiscalDocumentSummary`.
- `DailySalesSummary`.
- `ApiErrorResponse` con `code`, `message`, `details?`.

Cada `PosOrder` incluye `version`, totales de servidor y timestamps. Los objetos de UI pueden añadir estado local mediante tipos separados (`OrderDraftViewModel`), nunca alterando el contrato.

### 7.2 Comandos offline

`pos-command.models.ts`:

```ts
export type PosCommandType =
  | 'CREATE_ORDER'
  | 'ADD_LINE'
  | 'UPDATE_LINE'
  | 'SEND_ORDER'
  | 'ADD_PAYMENT'
  | 'FINALIZE_ORDER'
  | 'UPDATE_KITCHEN_TICKET';

export interface QueuedPosCommand<TData = unknown> {
  clientMutationId: string;
  deviceId: string;
  enterpriseId: string;
  type: PosCommandType;
  aggregateId?: string;
  expectedVersion?: number;
  clientCreatedAt: string;
  data: TData;
  status: 'PENDING' | 'SENDING' | 'CONFLICT' | 'FAILED';
  attempts: number;
  lastErrorCode?: string;
}
```

`data` es exactamente el DTO plano que se enviará. No contiene
`clientMutationId`; durante el replay la cola usa esa metadata como valor del
header `Idempotency-Key`.

No usar un comando genérico para acciones administrativas, devoluciones, anulaciones de líneas enviadas o cierre de caja. Esas operaciones sensibles requieren conexión y confirmación servidor en el MVP.

## 8. Servicios

### 8.1 `PosService`

Extiende `BaseHttpService` y expone métodos tipados que reflejan exactamente endpoints backend. No contiene estado UI.

Mínimos:

```text
getBootstrap(deviceId?, isoCursor?)
getSync(deviceId, opaqueServerCursor?)
createOrder(command)
addLine(orderId, command)
updateLine(orderId, lineId, command)
sendOrder(orderId, command)
cancelOrder(orderId, command)
voidLine(orderId, command)
addPayment(orderId, command)
voidPayment(orderId, paymentId, command)
finalizeOrder(orderId, command)
createRefund(orderId, command)
cancelRefund(orderId, refundId, command)
listKitchenTickets(filters)
updateKitchenTicket(command)
openCashSession(dto)
getCurrentCashSession(deviceId)
createCashMovement(sessionId, dto)
closeCashSession(sessionId, dto)
listOrders(filters)
getReceipt(fiscalDocumentId)
getDailySales(filters)
```

Cada método de comando añade `Idempotency-Key` mediante opciones HTTP locales. No modificar el interceptor global para generar claves: una repetición debe reutilizar la misma clave, no crear una nueva en cada retry.

`PATCH /api/pos/kitchen/tickets` no lleva ID en la URL; `ticketId` va en el body.
Después de crear una devolución hay que volver a consultar el pedido porque esa
respuesta no incluye la nueva `orderVersion`.

F4 añade métodos tipados separados para `sales-by-item`, `sales-by-category`,
`sales-by-hour`, `sales-by-payment-method`, `cash-deviation` e
`incomplete-costs`; no existe un endpoint genérico `getSalesSummary`.

### 8.2 `PosSessionStore`

Servicio `providedIn` dentro de la feature, suministrado por el shell/ruta para que una sesión no viva eternamente.

Signals fuente:

```text
settings
device
menuCategories
menuItems
areas
tables
activeOrders
selectedOrderId
cashSession
kitchenTickets
syncState
pendingCommandCount
lastSyncAt
```

Computed:

```text
selectedOrder
selectedOrderBalance
canTakePayment
tablesWithDerivedStatus
menuBySelectedCategory
hasOpenCashSession
hasBlockingConflict
```

Métodos del store orquestan UI -> servicio/cola -> actualización del signal. No duplicar cálculos fiscales: reemplazar siempre el pedido local por la respuesta autoritativa del backend tras una mutación online.

### 8.3 `PosOfflineQueueService`

Implementar IndexedDB nativo mediante una única pequeña envoltura Promise. Base `maingoo-pos`, versión `1`, stores:

| Store | Key | Contenido |
|---|---|---|
| `device` | `enterpriseId` | Dispositivo validado, cursor operacional opaco y última sincronización. |
| `bootstrap` | `enterpriseId` | carta/mesas/settings, `cursor` ISO y hora de cache local. |
| `orders` | `orderId` | pedidos activos necesarios para continuar. |
| `commands` | `clientMutationId` | cola ordenada por `clientCreatedAt`. |

Reglas:

- Usar `crypto.randomUUID()`; no añadir librería UUID.
- Una transacción IndexedDB guarda a la vez pedido local y comando cuando proceda.
- El cursor ISO de `bootstrap` y el cursor opaco de `/sync` se persisten en campos separados y nunca se intercambian.
- No guardar JWT, PIN, certificado, respuesta fiscal completa ni historial ilimitado.
- Borrar comandos confirmados y pedidos cerrados tras bootstrap confirmado.
- Limitar bootstrap/historial local a la empresa autenticada; al cambiar empresa/usuario, limpiar memoria y abrir su namespace lógico.
- Si IndexedDB falla o cuota se agota, bloquear nueva venta offline y mostrar error claro; no fingir que se guardó.

### 8.4 `PosSyncService`

Responsabilidades:

1. Escuchar `online/offline`, visibilidad y foco con APIs nativas.
2. En online, reproducir comandos `PENDING` en orden.
3. Marcar `SENDING`, enviar con la misma clave y actualizar pedido.
4. En `ORDER_VERSION_CONFLICT`, detener solo los comandos de ese pedido, guardar estado servidor y marcar `CONFLICT`.
5. En error transitorio/5xx, volver a `PENDING` con backoff; no bucle agresivo.
6. En 4xx de negocio, marcar `FAILED` y pedir intervención.
7. Al vaciar cola, drenar `/sync` con su cursor opaco para confirmar convergencia; refrescar `/bootstrap` solo si se necesita configuración/catálogo.

No lanzar dos sincronizadores. Proteger con un boolean/signal `isSyncing` y una única suscripción creada en el shell.

### 8.5 `ReceiptPrintService`

- Abre una ruta/vista de recibo ya renderizada.
- Espera a fuentes/imágenes con APIs de navegador cuando sea necesario.
- Invoca `window.print()` por acción de usuario.
- CSS `@media print` para 80 mm y A4 cuando corresponda.

No añadir SDK de impresora ni servidor local en MVP.

## 9. Bootstrap y ciclo de vida

Al entrar en `/ventas/terminal`:

1. Resolver identidad/permisos ya cargados por auth.
2. Leer `deviceId` de IndexedDB.
3. Si no existe, un usuario con `pos.manage` puede crear el dispositivo por
   nombre/código/tipo mediante `POST /api/pos/devices`; no existe endpoint público
   de vinculación por código para un cajero.
4. Renderizar inmediatamente bootstrap local válido, marcado “sin conexión/datos de hora X”.
5. Solicitar `GET /api/pos/bootstrap?deviceId=...&cursor=<ISO>`.
6. Validar `settings.enabled`, dispositivo y permisos.
7. Reemplazar cache y signals con respuesta servidor.
8. Solicitar `GET /api/pos/sync?deviceId=...&cursor=<opaco>` hasta recibir menos
   de 200 cambios; guardar `serverCursor` sin interpretarlo.
9. Iniciar polling/sync solo mientras documento sea visible.

El bootstrap devuelve settings, dispositivo, categorías/artículos, modificadores,
estaciones, áreas/mesas, caja, cambios de configuración y cursor ISO. No devuelve
pedidos activos, tickets, `serverUpdatedAt` ni una hora de servidor separada. El
estado operacional llega por `/sync`; sus cambios incluyen pedidos, tickets,
sesiones/movimientos de caja y jobs de stock.

## 10. Shell operativo

Crear `PosOperationShellComponent` para terminal y KDS:

- cabecera compacta con establecimiento, dispositivo, usuario y hora;
- estado online/offline/sincronizando/conflicto siempre visible;
- acceso a terminal, cocina, caja e historial según permiso;
- botón de salida al dashboard;
- bloquea cierre/navegación accidental si hay comandos no persistidos (la cola sí persistida no bloquea);
- foco visible, áreas táctiles mínimas y navegación teclado básica.

No modificar globalmente `AppLayout`. Usar un dato de ruta/clase localizada para modo operativo y restaurar el layout en `ngOnDestroy`/efecto de limpieza.

## 11. Pantalla Terminal

### 11.1 Layout

En escritorio/tablet horizontal:

```text
+--------------------------------------------------------------+
| estado / mesa / empleado / conexión                          |
+----------------------+-----------------------+---------------+
| categorías / sala    | cuadrícula de carta   | pedido actual |
| y mesas              |                       | total/cobro    |
+----------------------+-----------------------+---------------+
```

En ancho reducido: paneles secuenciales `Mesa -> Carta -> Pedido`, conservando botón fijo para ver total. No intentar mostrar tres columnas comprimidas.

### 11.2 Flujo de mesa/pedido

- Mesa libre: toque crea pedido `DINE_IN` tras confirmar número de comensales opcional.
- Mesa ocupada: abre su pedido activo.
- Takeaway: botón explícito crea pedido sin mesa.
- El estado visual de mesa se deriva de pedidos; no se edita manualmente.
- Un usuario con conflicto no puede seguir añadiendo a esa copia hasta resolver.

### 11.3 Carta

- Tabs/chips de categorías ordenadas.
- Tarjeta grande con nombre, precio, disponibilidad y alérgenos si backend los expone.
- Búsqueda local sobre bootstrap; no llamar backend por tecla.
- Artículo con modificadores abre diálogo y valida mínimos/máximos.
- Artículo inactivo recibido en error se retira/refresca; el pedido conserva snapshot si ya existía.

### 11.4 Pedido

- Lista de líneas con cantidad, modificadores, nota, estado y subtotal.
- Antes de enviar: editar cantidad/eliminar.
- Después de enviar: solo `Anular` con permiso `pos.void`, motivo obligatorio y confirmación.
- `Enviar a cocina` crea una ronda solo con líneas todavía `OPEN`.
- Mostrar subtotal, descuento, impuestos y total devueltos por backend.

### 11.5 Cobro

`PaymentDialog` muestra total, pagado y pendiente. Métodos efectivo/tarjeta/otro.

- Efectivo: importe recibido y cambio calculado para ayuda visual; backend valida pago real.
- Tarjeta: importe y referencia opcional; no capturar PAN.
- Pago dividido: varios pagos secuenciales contra el mismo pedido; no crear una lógica de reparto compleja por comensal en MVP.
- Finalizar se habilita con pendiente cero.
- Tras finalizar: recibir documento fiscal, mostrar impresión y estado de stock/fiscal si pendiente.
- Doble toque queda deshabilitado mientras la petición está en vuelo; idempotencia servidor es la protección definitiva.

## 12. KDS / Cocina

`KitchenDisplayComponent` agrupa tickets por estación y estado:

- `QUEUED`: nuevo.
- `IN_PROGRESS`: preparando.
- `READY`: listo.
- `SERVED`: desaparece de cola activa.

Cada tarjeta muestra número/mesa, tiempo desde envío, líneas, cantidades, modificadores/notas y ronda. Acciones grandes y reversibles solo al estado anterior permitido por backend.

Polling:

- cada 2 s con cursor `updatedAfter`;
- detener cuando pestaña oculta u offline;
- `exhaustMap` para evitar peticiones solapadas;
- al recuperar foco, refresh inmediato;
- merge por ID/versión, no concatenar duplicados.

Sonido para ticket nuevo es opcional y requiere permiso del navegador; no bloquear KDS si autoplay se rechaza.

## 13. Caja

`CashManagementComponent` tiene tres estados:

### Sin sesión

- importe inicial obligatorio;
- dispositivo visible;
- abrir requiere confirmación.

### Sesión abierta

- apertura, ventas efectivo, devoluciones, entradas/salidas y efectivo esperado;
- nueva entrada/salida exige tipo, importe, motivo y confirmación;
- no mostrar margen ni datos innecesarios al cajero.

### Cierre

- usuario introduce contado sin ver/ocultando esperado según decisión del negocio; por defecto mostrar esperado después de introducir contado para reducir sesgo;
- backend devuelve diferencia;
- el contrato actual de cierre solo acepta `countedCash`; si el negocio exige nota
  por diferencia habrá que ampliar primero el backend;
- recibo/resumen de cierre imprimible;
- una sesión cerrada es solo lectura.

No permitir cierre offline en MVP.

## 14. Historial, devoluciones y documentos

`SalesHistoryComponent` usa `ListShell/TablaDinamica` existentes si encajan:

- filtros servidor actuales por fecha, estado, canal, mesa y dispositivo;
- número de pedido y medio de pago requieren ampliar primero `GET /api/pos/orders`;
- paginación/cursor servidor;
- detalle abre drawer/modal con líneas, pagos, documento fiscal, control/coste y auditoría resumida;
- `getOrder` no devuelve todavía `stockSyncJob` ni una cronología de auditoría con nombres de actores;
  esos dos detalles requieren ampliar backend, no se simulan en cliente;
- reimprimir no reemite ni renumera;
- reimprimir y consultar estado fiscal requieren además `fiscal.read`;
- devolución exige `pos.refund`, conexión, motivo, importe permitido y confirmación;
- mostrar claramente que una devolución crea rectificativa/registro nuevo y no edita ticket original.

No descargar un historial completo para filtrarlo localmente.

## 15. Configuración TPV

`PosSettingsComponent` con tabs o secciones:

1. General: habilitación informativa, moneda/zona, pie de ticket.
2. Carta: categorías, artículos, precio, impuesto, receta y estación.
3. Sala: áreas/mesas, orden y capacidad.
4. Cocina: estaciones.
5. Dispositivos: alta, edición y última conexión. El Gateway tenant actual no
   expone revocación; no mostrar esa acción hasta ampliar el backend.
6. Fiscal: estado/configuración no secreta y validaciones; no exponer certificados.

Para vincular `MenuItem.foodPreparationId`, reutilizar el servicio/listado de elaboraciones existente. Mostrar coste por porción, precio, food cost y margen estimado antes de guardar. Si `trackStock=true`, bloquear guardado sin receta válida.

No construir un editor visual drag-and-drop de sala inicialmente. Una lista ordenable con nombre/capacidad cubre el MVP; añadir plano visual cuando clientes reales lo pidan.

## 16. Inventario

### 16.1 Resumen

Tabla con producto, saldo base/unidad, mínimo, valor, última actualización y
estado de revisión. Los filtros servidor actuales son búsqueda, bajo mínimo e
incluir inactivos; categoría y revisión quedan pendientes de ampliar backend.

Estados claros:

- normal;
- bajo mínimo;
- negativo;
- conversión/receta pendiente;
- sincronización de venta pendiente (solo si API lo agrega).

### 16.2 Movimientos

Historial paginado: fecha, tipo, delta firmado, saldo resultante si backend lo devuelve, coste, origen y actor. Los movimientos son solo lectura.

### 16.3 Ajuste/merma

Requiere `inventory.write`:

- producto;
- cantidad en unidad permitida;
- tipo `WASTE` o `MANUAL_ADJUSTMENT`;
- motivo cerrado y nota;
- vista previa del saldo;
- confirmación.

### 16.4 Recuento

- iniciar sesión de recuento;
- cargar productos por bloques/búsqueda;
- introducir cantidad contada;
- mostrar diferencia;
- completar una sola vez con confirmación;
- no editar después.

El Gateway actual solo permite crear y completar un recuento; no ofrece
listado/detalle para reanudarlo. En el MVP la UI conserva el recuento recién creado
en memoria hasta completarlo y deja claro que recargar obliga a iniciar otro. Si
se necesita reanudación, se amplía backend antes de implementarla.

El recuento no necesita modo offline en la primera versión; priorizar la cola de venta.

## 17. Informes

Primera versión:

- ventas brutas, descuentos, devoluciones, impuestos, venta neta;
- coste teórico y margen;
- ventas por hora, categoría, artículo y medio de pago;
- diferencia de caja;
- artículos sin receta/coste completo.

Usar tarjetas y tablas simples con datos backend. No añadir una librería de charts si PrimeNG o CSS existente cubre la visualización; las tablas son suficientes para el primer corte.

Mostrar `costStatus`:

- `CALCULATED`: margen disponible;
- `PENDING`: venta cerrada, stock/coste aún sincronizando;
- `INCOMPLETE`: falta unidad/receta/coste;
- `FAILED`: requiere soporte.

No representar un coste incompleto como cero.

## 18. Offline: alcance exacto

### Funciona offline

- abrir la app ya cargada;
- ver carta/mesas cacheadas con marca temporal;
- crear pedido con ID cliente;
- añadir/editar líneas no enviadas;
- enviar pedido a una KDS que esté en el mismo cliente solo visualmente; la entrega real a otra pantalla espera red;
- preparar el pedido para cobro, manteniéndolo pendiente hasta recuperar la conexión.

### Requiere conexión en MVP

- registrar/revocar dispositivo;
- cambiar carta/precios/impuestos;
- anular línea ya enviada;
- devoluciones;
- movimientos/cierre de caja;
- pagos, finalización y fiscalización mientras backend no exponga una política offline explícita;
- soporte y reintentos.

Resultado de la validación F5: `fiscalMode` no autoriza por sí solo operaciones
offline. La numeración, hash, documento fiscal y job de stock se crean en una
transacción servidor, y backend no expone todavía una política
`offlinePaymentsAllowed`. Por ello el MVP bloquea abrir caja, cobrar y finalizar
sin conexión, no imprime recibo y no muestra “venta completada”.

## 19. Conflictos

Cuando backend responde `ORDER_VERSION_CONFLICT`:

1. Guardar pedido servidor y comandos locales afectados.
2. Mostrar diálogo con resumen: “otro terminal cambió este pedido”.
3. Opciones: `Usar versión actual` y, solo para cambios reaplicables como añadir una línea, `Reaplicar mis cambios`.
4. Nunca reaplicar automáticamente pagos, finalización, anulaciones o descuentos.
5. Registrar resolución y continuar cola.

No implementar un merge genérico de objetos. Solo reaplicar comandos explícitamente seguros.

## 20. Estados de carga/error/accesibilidad

Cada página debe tener:

- skeleton inicial usando componente compartido;
- empty state accionable;
- error con reintento;
- estado offline persistente, no solo toast;
- botones deshabilitados con explicación cuando falta permiso/sesión/conexión;
- foco devuelto tras cerrar diálogos;
- labels accesibles, no depender solo de color;
- objetivos táctiles de al menos ~44 px en operación;
- contraste en modo oscuro existente;
- atajos opcionales documentados, nunca única vía.

Toast sirve para confirmaciones breves. Conflictos, riesgo de pérdida o acciones fiscales usan diálogo/panel persistente.

## 21. Traducciones

Añadir claves ES/EN bajo namespaces coherentes:

```text
pos.navigation.*
pos.terminal.*
pos.order.*
pos.payment.*
pos.kitchen.*
pos.cash.*
pos.settings.*
pos.sync.*
pos.errors.<CODE>
inventory.*
salesReports.*
```

No escribir textos literales en templates/componentes salvo símbolos/números. Para códigos backend sin traducción, fallback a `message` y código visible para soporte.

## 22. Seguridad cliente

- No guardar JWT nuevo en IndexedDB; mantener el mecanismo auth actual hasta un refactor separado.
- No guardar PIN, PAN, certificado ni secreto fiscal.
- Permisos ocultan UX, pero backend sigue siendo autoridad.
- Al logout, detener polling/sync, limpiar signals y cerrar DB; eliminar comandos solo si están confirmados. Si quedan pendientes, advertir antes de logout y conservarlos cifrados no está contemplado: para el piloto usar dispositivo dedicado y política operativa.
- Sanitizar/escapar ticket y notas mediante binding Angular normal; no usar `innerHTML` para datos del cliente.
- No imprimir ni loguear respuestas completas.

## 23. Pruebas

### 23.1 Unitarias mínimas

Crear specs junto a lógica no trivial:

- `pos-session.store.spec.ts`: selección, balance, estados de mesa y reemplazo por respuesta servidor.
- `pos-offline-queue.service.spec.ts`: orden, persistencia, borrado confirmado y error de cuota usando adapter de IndexedDB testeable mínimo.
- `pos-sync.service.spec.ts`: replay, retry transitorio, conflicto y parada por pedido.
- `pos-terminal.component.spec.ts`: permiso/sesión y doble submit.
- `cash-management.component.spec.ts`: cierre/validación.
- `kitchen-display.component.spec.ts`: merge incremental sin duplicados.
- `inventory.service.spec.ts`: URLs/contratos principales.

No crear specs que solo comprueban que el componente existe.

### 23.2 Escenarios integrados/manuales

1. Registrar terminal, abrir caja, abrir mesa, añadir artículo, enviar, marcar listo, cobrar, finalizar e imprimir.
2. Pago dividido efectivo/tarjeta con cambio correcto y un único cierre.
3. Doble toque/retry produce un pago.
4. Cortar red, crear dos comandos, recargar navegador, recuperar red y sincronizar en orden.
5. Dos pestañas/terminales crean conflicto; no se pierde silenciosamente.
6. Revocar dispositivo desde Admin; el terminal sale de operación al siguiente sync.
7. Backend deja stock pendiente; venta se muestra cerrada con estado recuperable.
8. Usuario sin `pos.refund` no ve ni puede invocar devolución.
9. Modo oscuro, 1024x768 táctil, teclado y lector básico.

### 23.3 Comandos de verificación

Usar scripts reales de `package.json`:

- formatter/lint si existen;
- tests afectados;
- `npm run build`.

No declarar terminado con errores TypeScript, traducciones faltantes o warnings nuevos de plantilla.

## 24. Orden de implementación para Codex

### F0 — Contratos y navegación

- Modelos, permisos, rutas lazy y sidebar.
- Reemplazar placeholder sin eliminarlo hasta que la ruta nueva compile.
- `PosService` + mocks/fixtures solo para tests, no modo demo de producción.

### F1 — Bootstrap y configuración mínima

- Alta de dispositivo solo para `pos.manage`; selección de uno existente para el terminal.
- Hasta F5, persistir únicamente el `deviceId` no secreto en `localStorage`; F5 lo
  migra al store IndexedDB aislado por empresa.
- Store signals y bootstrap online.
- Carta/categorías/mesas/dispositivos.
- Estados loading/error/permissions.

### F2 — Terminal online

- Mesa/takeaway, carta, pedido, modificadores.
- Envío a cocina.
- Apertura de caja, pagos, finalización, ticket.
- Conflicto de versión online.

### F3 — Cocina y caja

- KDS incremental.
- Movimientos, cierre y resumen de caja.
- Historial/reimpresión/devolución.

### F4 — Inventario y margen

- Resumen/movimientos.
- Merma/ajuste/recuento.
- Informes y estados de coste.

### F5 — Offline

- IndexedDB y cache bootstrap.
- Cola de comandos.
- Sync/retry/conflicto/recuperación tras reload.
- Validación con reglas fiscales reales antes de habilitar finalización offline.

### F6 — Endurecimiento

- Accesibilidad, objetivos táctiles y layouts tablet sin scroll horizontal global.
- Integración automatizada del turno de venta online/offline, reload, replay, cobro, finalización, fiscalidad, stock y conflicto. Cocina y cierre/movimientos de caja mantienen sus pruebas aisladas y la validación manual del piloto.
- Telemetría local acotada y visible de errores/sync sin IDs, payloads ni datos sensibles; el envío central queda pendiente de un contrato backend específico.
- Runbook de operación, soporte, cierre y rollback del piloto en `docs/pos-pilot-operations.md`.

Cada fase debe poder desplegarse detrás de `PosSettings.enabled=false` para empresas no piloto. No crear un framework genérico de feature flags; usar el setting de POS devuelto por backend.

## 25. Criterios de aceptación por pantalla

### Terminal

- [ ] Funciona a 1024x768 y escritorio sin scroll horizontal global.
- [ ] Acciones comunes requieren pocos toques y tienen estado de progreso.
- [ ] Totales provienen del servidor y muestran impuestos/descuentos.
- [ ] No permite cobrar sin caja abierta.
- [ ] Retry/doble toque no duplica.
- [ ] Conflicto nunca sobrescribe silenciosamente.

### Cocina

- [ ] Nuevos tickets aparecen sin recargar página.
- [ ] No hay duplicados tras polling/foco.
- [ ] Estados y tiempos son visibles sin depender solo del color.

### Caja

- [ ] Apertura/movimientos/cierre requieren permiso y confirmación.
- [ ] Esperado viene de backend.
- [ ] Cierre queda solo lectura e imprimible.

### Offline

- [ ] Un reload conserva pedidos/comandos persistidos.
- [ ] La UI diferencia guardado local de confirmado servidor.
- [ ] Recuperar red reproduce una vez y en orden.
- [ ] Error de almacenamiento bloquea operación insegura.

### Inventario

- [ ] Nunca muestra coste incompleto como cero.
- [ ] Ajustes/mermas tienen motivo y confirmación.
- [ ] Movimientos históricos no se editan.

## 26. Definición de terminado

Una tarea frontend no está terminada hasta que:

- respeta standalone/Tailwind/PrimeNG/ngx-translate del repo;
- usa permisos tanto en ruta como acciones sensibles;
- maneja loading, vacío, error, offline y conflicto;
- no introduce `any`, `console.log` ni suscripciones sin cleanup;
- contratos y códigos coinciden con backend;
- importes decimales no sufren cálculos de coma flotante para decisiones finales;
- teclado, foco, labels y contraste están comprobados;
- tests útiles pasan y build de producción termina;
- no altera `src/environments/environment.ts` salvo necesidad explícita y revisión del cambio local existente.

## 27. Fuera del MVP

- plano drag-and-drop de mesas;
- reparto automático por comensal;
- integración Glovo/Just Eat/Uber Eats;
- reservas;
- fidelización;
- pagos bancarios embebidos;
- impresión silenciosa y cajón automático;
- WebSocket/Redis;
- modo teléfono completo;
- inventario offline;
- constructor libre de dashboards;
- modificadores con consumo de stock.

## 28. Lista final de verificación frontend

- [ ] `/ventas` ya no es placeholder y está protegido por permisos.
- [ ] Sidebar muestra Ventas/Inventario con nombres no ambiguos.
- [ ] Bootstrap carga una superficie operativa coherente.
- [ ] Dispositivo y caja se validan antes de venta/cobro.
- [ ] Pedido, cocina, pago y ticket completan el flujo.
- [ ] Store feature-local no invade estado global.
- [ ] IndexedDB conserva cola sin guardar secretos.
- [ ] Idempotencia y versiones se envían en toda mutación aplicable.
- [ ] Conflictos se resuelven explícitamente.
- [ ] Inventario muestra movimientos y ajustes auditables.
- [ ] Informes distinguen coste pendiente/incompleto.
- [ ] Fiscalidad se presenta como estado servidor, no se calcula en cliente.
- [ ] Traducciones, accesibilidad, tests y build están verdes.
