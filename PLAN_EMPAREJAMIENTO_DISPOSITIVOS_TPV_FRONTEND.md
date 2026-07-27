# Plan frontend — emparejamiento KDS y terminal con PIN

> Repositorio: `Maingoo-Front`
>
> Fecha de referencia: 27 de julio de 2026.
>
> Este documento amplía `PLAN_IMPLEMENTACION_TPV_FRONTEND.md` y reutiliza las
> pantallas TPV ya implementadas.

## 1. Resultado funcional cerrado

| Ruta/superficie | Autenticación | Función |
|---|---|---|
| `/dispositivo` | Pública durante el reto; después credencial de dispositivo | Emparejar y recuperar un dispositivo. |
| `/dispositivo/cocina` | Dispositivo KDS | KDS automático, sin usuario ni PIN. |
| `/dispositivo/terminal` | Dispositivo REGISTER + PIN de empleado | Tomar y enviar pedidos. |
| `/ventas/caja` | Usuario y contraseña actuales + `pos.cash` | Cobrar/finalizar ventas y gestionar caja. |
| `/ventas/configuracion` | Usuario actual + `pos.manage` | Aprobar, configurar y revocar dispositivos. |
| Resto de Maingoo | Usuario y contraseña actuales | Sin cambios. |

No se deben crear cuentas genéricas como `cocina@...` ni guardar el login humano
en las pantallas operativas.

## 2. Implicación sobre el TPV actual

Actualmente:

- `/ventas/cocina` exige una sesión humana y permite elegir un KDS.
- `/ventas/terminal` exige una sesión humana, permite elegir un `REGISTER` y
  contiene tanto el pedido como el cobro.
- `/ventas/caja` gestiona apertura, cierre y movimientos, pero no concentra el
  cobro de pedidos.

Estado objetivo:

1. El dispositivo se identifica una sola vez mediante `/dispositivo`.
2. KDS toma su identidad de la credencial y deja de mostrar selector de dispositivo.
3. Terminal toma su dispositivo de la credencial y solicita únicamente el PIN del
   camarero.
4. Terminal conserva carta, mesas, pedido y envío a cocina.
5. El bloque de pago/finalización/ticket se reutiliza dentro de `/ventas/caja`.
6. Un terminal con PIN no muestra ni llama a pagos, finalización, devoluciones o
   movimientos de caja.

No duplicar los componentes de pago existentes en
`src/app/features/ventas/components/payment/`.

## 3. Arquitectura de rutas

Modificar `src/app/app.routes.ts` para que las rutas de dispositivo estén fuera de
`AppLayout` y `authGuard`:

```ts
export const appRoutes: Routes = [
  {
    path: 'dispositivo',
    loadChildren: () => import('./features/device/device.routes')
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      // rutas humanas actuales
    ]
  }
];
```

Crear:

```text
src/app/features/device/
  device.routes.ts
  models/device-session.models.ts
  services/device-pairing.service.ts
  services/device-session.service.ts
  services/device-session-storage.service.ts
  guards/paired-device.guard.ts
  guards/device-mode.guard.ts
  pages/
    pairing/device-pairing.component.{ts,html}
    terminal-login/terminal-pin.component.{ts,html}
    revoked/device-revoked.component.{ts,html}
  components/
    device-shell/device-shell.component.ts
    pairing-code/pairing-code.component.ts
    pin-pad/pin-pad.component.ts
```

No crear archivos vacíos ni un segundo store global. `DeviceSessionService` con
signals es la única fuente de identidad del dispositivo.

Rutas:

| Ruta | Guard | Componente |
|---|---|---|
| `/dispositivo` | ninguno | Crea/reanuda reto o redirige según credencial. |
| `/dispositivo/cocina` | paired + modo KDS | Reutiliza `KitchenDisplayComponent`. |
| `/dispositivo/terminal` | paired + modo REGISTER | PIN o terminal según sesión activa. |
| `/dispositivo/revocado` | ninguno | Explica y permite volver a emparejar. |

`/ventas/cocina` y `/ventas/terminal` pueden mantenerse durante el desarrollo,
pero al cerrar la migración deben redirigir a `/dispositivo` o mostrar una llamada
clara para abrir el modo dispositivo. No conservar dos modos operativos finales.

## 4. Modelos del cliente

```ts
type DeviceMode = 'KDS' | 'REGISTER';
type PairingStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

interface DevicePairingChallenge {
  pairingId: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

interface PairedDeviceIdentity {
  device: {
    id: string;
    enterpriseId: string;
    name: string;
    type: DeviceMode;
    kitchenStationId: string | null;
    status: 'ACTIVE';
  };
  deviceToken: string;
  expiresAt: string;
}

interface PosEmployeeSession {
  user: {
    id: string;
    name: string;
  };
  permissions: string[];
  operatorToken: string;
  expiresAt: string;
}
```

Nunca exponer tokens en plantilla, URL, errores o telemetría.

## 5. Almacenamiento local

Crear una base IndexedDB nativa separada, por ejemplo
`maingoo-pos-device-session`, con un único object store `session`.

Registros:

```text
pairedIdentity  -> device, deviceToken, expiresAt
operatorSession -> user, permissions, operatorToken, expiresAt
pendingPairing  -> pairingId, deviceCode, userCode, expiresAt
```

Reglas:

- No usar las claves humanas `accessToken`, `refreshToken` o `user`.
- No guardar PIN.
- Borrar `pendingPairing` al consumir, denegar o vencer.
- Borrar `operatorSession` en logout, expiración o revocación.
- Borrar todo al recibir `DEVICE_REVOKED`, `DEVICE_TOKEN_EXPIRED` o
  `DEVICE_TOKEN_INVALID`.
- Conservar la credencial del dispositivo al cambiar de camarero.
- IndexedDB no se presenta como almacén invulnerable; la defensa principal es el
  token aleatorio acotado, revocable, TLS y ausencia de secretos en URLs.

Reutilizar el estilo y manejo de errores de
`PosOfflineQueueService`, pero no mezclar la identidad de dispositivo con las
colas de pedidos por empresa.

## 6. Selección explícita del esquema de autenticación HTTP

El interceptor humano actual añade `Bearer` a cualquier petición cuando existe un
token en `localStorage`. Debe dejar intacta una petición que ya declare otro modo.

Crear un `HttpContextToken`:

```ts
type PosAuthMode = 'HUMAN' | 'PUBLIC' | 'DEVICE' | 'DEVICE_EMPLOYEE';
```

Cada método de servicio selecciona explícitamente el modo:

- crear/sondear reto: `PUBLIC`;
- KDS/contexto: `DEVICE`;
- terminal operativo: `DEVICE_EMPLOYEE`;
- configuración/caja: `HUMAN`.

El interceptor de dispositivo:

```text
DEVICE          -> Authorization: Device <deviceToken>
DEVICE_EMPLOYEE -> Authorization: DeviceEmployee <operatorToken>
PUBLIC          -> no Authorization
HUMAN           -> deja actuar al authInterceptor actual
```

Reglas:

- `authInterceptor` no sobrescribe `Authorization` existente.
- No elegir el modo únicamente por la URL visible del navegador.
- Ninguna petición de Caja puede usar `DEVICE_EMPLOYEE`.
- Si falta el token solicitado, fallar localmente y redirigir; no caer
  silenciosamente a `Bearer`.

## 7. Pantalla `/dispositivo`

### 7.1 Arranque

Al entrar:

1. cargar IndexedDB;
2. si existe credencial no vencida, consultar `/api/pos/device-context`;
3. redirigir a Cocina o Terminal según el tipo devuelto por backend;
4. si no existe credencial, reanudar un reto pendiente no vencido;
5. si tampoco existe reto, mostrar elección `Pantalla de cocina` o
   `Terminal de camarero`.

La elección solo solicita:

- tipo;
- nombre sugerido opcional del equipo, por ejemplo “Tablet barra”.

El responsable confirma nombre/estación al aprobar.

### 7.2 Reto visual

Mostrar:

- logo Maingoo;
- QR generado con la dependencia `qrcode` ya instalada;
- código en grupos legibles;
- cuenta atrás;
- instrucciones: “Escanea con una cuenta responsable o introduce el código en
  Configuración > Dispositivos”;
- estado de conexión;
- botón para cancelar/generar otro código.

No mostrar empresa ni datos privados antes de la aprobación.

Sondeo:

- respetar `pollIntervalSeconds`;
- pausar cuando `document.hidden`;
- detener en destroy;
- ante `PAIRING_SLOW_DOWN`, aumentar el intervalo;
- al aprobar/canjear, guardar credencial antes de redirigir;
- ante expiración, ofrecer un nuevo reto sin recargar toda la app.

### 7.3 Aprobación desde móvil/ordenador responsable

El QR abre:

```text
/ventas/configuracion/dispositivos/emparejar?code=ABCD-EFGH
```

Esta ruta sigue bajo login humano y `pos.manage`.

Actualizar `authGuard`/login para conservar un `returnUrl` seguro, interno y
relativo. Después del login debe volver a la aprobación; nunca aceptar un
`returnUrl` absoluto externo.

Pantalla de aprobación:

- código grande para comparar con el dispositivo;
- tipo solicitado;
- etiqueta/appVersion si existen;
- campo obligatorio `Nombre`;
- selector de estación para KDS, con opción “Todas”;
- confirmación explícita;
- botones Aprobar y Rechazar.

No mostrar ni manejar `deviceCode` o token permanente.

## 8. KDS emparejado

Reutilizar `KitchenDisplayComponent` y su polling.

Cambios:

- eliminar selector de dispositivo en modo `/dispositivo/cocina`;
- obtener `deviceId`, empresa y estación de `DeviceSessionService`;
- no depender de `AuthService.getEnterpriseId()`;
- enviar las peticiones con modo `DEVICE`;
- si el dispositivo tiene estación fija, no permitir elegir otra;
- si backend devuelve estación `null`, conservar el filtro visual por estaciones;
- mostrar nombre del dispositivo y estado online en el shell;
- ofrecer “Desvincular” solo tras confirmación y, preferiblemente, PIN/login de
  responsable; el botón normal de KDS solo debe bloquear la pantalla.

Estados:

| Código | Acción |
|---|---|
| `DEVICE_REVOKED` | Borrar sesión y abrir `/dispositivo/revocado`. |
| `DEVICE_TOKEN_EXPIRED` | Borrar sesión y pedir reemparejamiento. |
| `DEVICE_STATION_NOT_ALLOWED` | Recargar contexto; si persiste, mostrar soporte. |
| Sin red | Mantener tickets en memoria, deshabilitar transiciones y reintentar. |

## 9. Terminal y PIN

### 9.1 Pantalla bloqueada

Al entrar en `/dispositivo/terminal`:

- validar credencial REGISTER;
- si no existe sesión de empleado activa, mostrar teclado PIN;
- aceptar 4–6 dígitos;
- no permitir copiar/pegar ni guardar el valor;
- enviar al completar o mediante botón Entrar;
- limpiar el PIN tras cualquier respuesta;
- mensaje genérico para `EMPLOYEE_PIN_INVALID`;
- mostrar contador/bloqueo para `EMPLOYEE_PIN_LOCKED`.

No mostrar lista de empleados: evita revelar personal y simplifica el acceso
rotativo.

### 9.2 Sesión activa

Mostrar siempre:

- nombre del empleado;
- nombre del terminal;
- estado de sincronización;
- botón `Bloquear / cambiar camarero`.

`Bloquear / cambiar camarero`:

1. si no hay comandos pendientes, revoca la sesión y vuelve al PIN;
2. si hay comandos pendientes online, sincroniza y después cierra;
3. si hay comandos pendientes offline, impide cambiar y explica que deben
   sincronizarse para no perder su autoría.

En recarga de página, restaurar la sesión de operador si no venció. Si venció con
comandos pendientes, conservar la cola y mostrar recuperación; no reasignar esos
comandos al siguiente empleado.

### 9.3 Operaciones permitidas

Reutilizar `PosTerminalComponent` para:

- áreas y mesas;
- carta, categorías y modificadores;
- crear/editar pedido;
- enviar a cocina;
- anulaciones autorizadas.

En modo dispositivo ocultar/eliminar:

- abrir diálogo de pago;
- pago en efectivo/tarjeta;
- finalizar;
- ticket fiscal;
- devoluciones;
- accesos de configuración/caja/informes.

El frontend no es la barrera de seguridad; backend debe rechazar igualmente.

## 10. Caja humana y cobro

Ampliar `/ventas/caja` sin cambiar su autenticación:

- continúa bajo `authGuard`, `PosCash` y `Bearer`;
- seleccionar/buscar pedidos enviados o pendientes de pago;
- abrir el componente de pago existente;
- registrar efectivo/tarjeta/otro;
- finalizar y mostrar/imprimir ticket;
- mantener apertura, movimientos y cierre actuales;
- conservar confirmaciones y validación de sesión de caja.

Reutilización recomendada:

```text
components/payment/payment-dialog.component
components/payment/receipt-view.component
services/receipt-print.service.ts
```

Si la lógica de pago está dentro de `PosTerminalComponent`, extraer solo el
controlador mínimo necesario a un componente compartido por Caja; no crear un
store de pagos adicional.

El pedido conserva `openedByUserId` del camarero que usó PIN y el pago/finalización
queda atribuido al usuario humano de Caja.

## 11. Gestión de PIN en Usuarios

La gestión corresponde a responsables del negocio, no al dispositivo.

Ampliar:

```text
src/app/features/users/interfaces/user-management.interface.ts
src/app/features/users/services/user.service.ts
src/app/features/users/users.component.ts
src/app/features/users/users.component.html
```

`ManagedUser` añade:

```ts
posPinConfigured: boolean;
```

En el detalle del usuario:

- estado `PIN TPV configurado / sin configurar`;
- acción `Asignar o cambiar PIN`;
- acción `Desactivar PIN`;
- dos campos PIN/confirmación;
- validación 4–6 dígitos y coincidencia;
- explicación de que el PIN solo funciona en terminales emparejados;
- nunca volver a mostrar el PIN guardado.

Permiso visual y backend: `users.write`.

No añadir el PIN al formulario general de creación de usuario: primero se crea el
usuario y se asignan sus permisos; después se configura el PIN de forma explícita.

## 12. Configuración de dispositivos

En la pestaña existente `Configuración TPV > Dispositivos`:

- botón `Emparejar dispositivo`;
- campo para introducir código;
- listado con estado de emparejamiento;
- tipo, estación, última conexión, versión y caducidad aproximada;
- acción revocar/desvincular con confirmación;
- no permitir ver/copiar token.

Estados visuales:

```text
Sin emparejar
Esperando aprobación
Activo
Sin conexión
Credencial próxima a caducar
Revocado
```

La aprobación crea el dispositivo. Evitar un segundo flujo que obligue a crear
manualmente el registro antes de introducir el código.

## 13. Shell operativo

`DeviceShellComponent`:

- pantalla completa, sin sidebar;
- `mg-surface`/tokens existentes, compatible con tema oscuro;
- salida visible hacia bloqueo/reemparejamiento, no hacia administración;
- responsive para tablet horizontal y pantalla KDS;
- foco visible, controles táctiles de al menos 44px y labels accesibles;
- aviso persistente de offline/revocado/expiración.

No duplicar `PosShellComponent`; reutilizar sus clases/tokens y extraer únicamente
lo común que ambos shells consuman realmente.

## 14. Offline

### KDS

- Puede conservar tickets ya cargados en memoria.
- No cambiar estados sin red.
- Al volver, polling incremental normal.

### Terminal

- Conserva la cola IndexedDB existente.
- Cada comando queda ligado localmente a la sesión de empleado que lo creó.
- No cambiar empleado con cola pendiente sin sincronizar.
- No cobrar ni finalizar offline desde terminal.
- Si vence el operator token online, renovar sesión mediante nuevo PIN.
- Si vence offline, permitir visualizar la cola pero no crear nuevos comandos.

### Caja

Mantiene el comportamiento humano actual. Los cobros siguen requiriendo conexión,
sesión de caja y autenticación humana.

## 15. Tratamiento de errores

Mapear por `code`, nunca por texto:

```text
PAIRING_PENDING
PAIRING_DENIED
PAIRING_EXPIRED
PAIRING_SLOW_DOWN
PAIRING_CODE_INVALID
DEVICE_TOKEN_INVALID
DEVICE_TOKEN_EXPIRED
DEVICE_REVOKED
DEVICE_CONTEXT_MISMATCH
DEVICE_TYPE_NOT_ALLOWED
DEVICE_STATION_NOT_ALLOWED
EMPLOYEE_PIN_INVALID
EMPLOYEE_PIN_DUPLICATED
EMPLOYEE_PIN_LOCKED
EMPLOYEE_PERMISSION_REQUIRED
EMPLOYEE_SESSION_EXPIRED
EMPLOYEE_SESSION_REVOKED
ACTOR_TYPE_NOT_ALLOWED
```

`httpErrorInterceptor` no debe intentar refrescar el JWT humano para una petición
`DEVICE` o `DEVICE_EMPLOYEE`.

## 16. Traducciones

Añadir claves bajo:

```text
device.pairing.*
device.revoked.*
device.terminalPin.*
device.session.*
pos.settings.devicePairing.*
pos.cash.orderPayment.*
users.posPin.*
```

Actualizar al menos `es.json` y los idiomas actualmente obligatorios por el
repositorio. No dejar texto visible literal en componentes.

## 17. Pruebas

### Unitarias

- almacenamiento y limpieza de credenciales;
- selección explícita del esquema HTTP;
- `authInterceptor` no pisa `Device`;
- reanudación/expiración de reto;
- pausa de polling al ocultar documento;
- guards por tipo KDS/REGISTER;
- PIN se limpia después de enviar;
- logout bloqueado con cola pendiente;
- KDS no muestra selector de dispositivo;
- Terminal dispositivo no renderiza pago;
- Caja humana reutiliza pago/finalización;
- gestión de PIN nunca conserva el valor.

### Integración frontend HTTP

- reto público sin `Bearer`;
- aprobación con `Bearer`;
- KDS con `Device`;
- terminal con `DeviceEmployee`;
- caja con `Bearer`;
- 401 de dispositivo no dispara refresh humano;
- retorno al QR después de login del responsable.

### E2E manual/automatizado

1. Dispositivo nuevo muestra QR y código.
2. Responsable escanea, inicia sesión, vuelve a aprobación y asigna estación.
3. KDS arranca sin usuario y sobrevive recarga.
4. Terminal pide PIN y muestra el nombre correcto.
5. Camarero envía pedido y cocina lo recibe.
6. Terminal no ofrece cobro.
7. Usuario entra en Caja, selecciona el pedido, cobra y finaliza.
8. Cambiar de camarero conserva el dispositivo.
9. Revocar desde configuración expulsa el dispositivo.
10. Offline con cola impide cambiar de camarero.

Comandos de verificación:

```bash
npm run lint
npx tsc --noEmit
npx ngc -p tsconfig.app.json
npm test -- --watch=false
npm run build
```

## 18. Orden de implementación y commits

### DF0 — Contratos, rutas y almacenamiento

- modelos, `HttpContextToken`, storage y guards;
- ruta pública fuera del layout;
- tests de interceptores.

Puerta: navegar a `/dispositivo` sin login no redirige a `/auth/login`.

### DF1 — Reto y aprobación

- elección de tipo, QR/código, polling y expiración;
- retorno tras login;
- aprobación en Configuración.

Puerta: un dispositivo recibe y persiste su credencial una sola vez.

### DF2 — KDS automático

- reutilizar KDS con identidad de dispositivo;
- estación y revocación;
- retirar selector manual final.

Puerta: recarga abre directamente KDS sin usuario.

### DF3 — Terminal con PIN

- teclado PIN, sesión de empleado y lock/change;
- adaptar terminal al contexto de dispositivo;
- retirar cobro del modo terminal.

Puerta: dos camareros alternan en el mismo terminal y la autoría es correcta.

### DF4 — Caja y PIN de usuarios

- mover/reutilizar cobro en Caja humana;
- asignar/cambiar/desactivar PIN desde Usuarios.

Puerta: terminal crea el pedido y Caja lo cobra con actores distintos.

### DF5 — Endurecimiento

- offline, errores, accesibilidad, traducciones, tests y build.

Puerta: escenarios E2E y checklist completos.

Crear un commit por fase DF. No incluir cambios locales ajenos de
`src/environments/environment.ts`.

## 19. Estimación

| Trabajo | Días |
|---|---:|
| Ruta pública, pairing y almacenamiento | 3–4 |
| KDS automático | 2–3 |
| Terminal y PIN | 3–4 |
| Traslado/reutilización de cobro en Caja | 2–3 |
| Gestión PIN en Usuarios | 1–2 |
| Offline, accesibilidad y pruebas | 3–4 |
| **Frontend total** | **14–20** |

Con backend disponible y trabajo paralelo: 8–12 días laborables.

## 20. Fuera de alcance

- PIN para Caja o Administración.
- Cobro desde terminal de camarero.
- 2FA.
- QR como credencial permanente.
- Biométricos/NFC.
- MDM, fullscreen forzado o bloqueo del sistema operativo.
- Aplicación nativa específica: esta fase mantiene Angular/PWA.

## 21. Definición de terminado

- [ ] `/dispositivo` funciona sin login y fuera de `AppLayout`.
- [ ] QR/código expiran y nunca contienen token permanente.
- [ ] KDS abre automáticamente después de emparejar.
- [ ] Terminal exige PIN personal y permite cambiar camarero.
- [ ] Terminal no puede mostrar ni invocar cobros.
- [ ] Caja con usuario/contraseña cobra y finaliza pedidos.
- [ ] Configuración permite aprobar y revocar.
- [ ] Usuarios permite asignar/cambiar/desactivar PIN sin revelarlo.
- [ ] Cada petición usa explícitamente `Bearer`, `Device` o `DeviceEmployee`.
- [ ] Revocación y expiración limpian almacenamiento local.
- [ ] Offline no pierde ni reasigna comandos.
- [ ] Traducciones, accesibilidad, tests, lint y build pasan.
