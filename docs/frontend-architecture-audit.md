# Auditoria de Reentrada y Mapa Tecnico de Maingoo Front

## Objetivo

Documento de onboarding tecnico para recuperar contexto del frontend Maingoo. Resume como esta construido el proyecto, que piezas se pueden reutilizar, que patrones deben mantenerse y que mejoras conviene priorizar.

Este documento describe el estado actual del repositorio. No es una bitacora: cuando cambie la arquitectura, debe actualizarse el estado vigente y eliminar informacion obsoleta.

## Resumen Ejecutivo

- Aplicacion Angular 19 con componentes standalone, PrimeNG 19, Tailwind CSS 3 y `tailwindcss-primeui`.
- Arquitectura principal por features en `src/app/features`, con capas transversales `core`, `shared` y `layout`.
- Las piezas reutilizables mas importantes son shells visuales (`CardShell`, `DetailCardShell`, `ListShell`), tabla generica (`TablaDinamica`), iconos, skeletons, empty states, layout shell, topbar/sidebar/mobile y servicios compartidos de toast, confirmacion, modal y layout.
- El sistema visual actual debe basarse en PrimeNG + tokens Tailwind PrimeUI + utilidades `mg-*` en `src/tailwind.css`.
- La deuda principal esta en cobertura de tests, duplicacion de patrones UI entre features, algunos flujos grandes en componentes, almacenamiento de tokens en `localStorage`, accesibilidad parcialmente relajada en ESLint y areas funcionales todavia mock/demo.
- Antes de crear componentes nuevos, revisar si encajan en `shared/components`, `layout/component` o como componente feature-local reutilizable por una familia concreta.

## Mapa de Arquitectura

### Capas Principales

| Capa | Ruta | Responsabilidad | Regla de uso |
| --- | --- | --- | --- |
| App config/routing | `src/app/app.config.ts`, `src/app/app.routes.ts` | Providers globales, PrimeNG, interceptores, rutas raiz y guards | Mantener configuracion global centralizada |
| Core | `src/app/core` | Servicios base, guards, interceptores, enums, constantes, pipes e interfaces transversales | Codigo transversal sin dependencia visual de features |
| Shared | `src/app/shared` | Componentes, servicios, helpers e interfaces reutilizables entre varias features | Solo mover aqui lo usado por mas de una feature o claramente reusable |
| Layout | `src/app/layout` | Shell de aplicacion, topbar, sidebar, navegacion movil, configurador y layout state | Cambios de experiencia global, navegacion y tema |
| Features | `src/app/features` | Pantallas y flujos de producto | Mantener cada dominio autocontenido |
| Estilos globales | `src/styles.scss`, `src/tailwind.css`, `tailwind.config.js` | Tokens, utilidades `mg-*`, Tailwind, integracion PrimeNG | Evitar estilos globales ad hoc fuera de tokens compartidos |
| Assets | `src/assets`, `public` | i18n, assets estaticos y recursos publicos | No colocar logica ni configuracion sensible |

### Configuracion Global

- PrimeNG se configura con Aura y `darkModeSelector: '.app-dark'`.
- `p-toast` y `p-confirmDialog` viven en `src/app/app.component.html`; no deben duplicarse en features.
- Los interceptores principales son `auth.interceptor.ts` y `http-error.interceptor.ts`.
- `BaseHttpService` centraliza helpers HTTP y debe ser la base para servicios de API.
- Permisos de rutas usan `ngx-permissions` y `AppPermission`.

## Rutas Reales

| Ruta | Feature/componente | Proteccion | Estado funcional |
| --- | --- | --- | --- |
| `/` | `Dashboard` | `authGuard` | Dashboard principal con KPIs, enlaces y paneles |
| `/facturas` | `invoices/invoice.routes` | `InvoicesRead` | Resumen de facturas, tabla generica y subida/analisis |
| `/facturas/detalle/:id` | `InvoiceDetailComponent` | Heredada de facturas | Detalle de factura y documento asociado |
| `/proveedores` | `SupplierComponent` | `SuppliersRead` | Listado, tarjetas, detalle, facturas y graficas |
| `/productos` | `products/product.routes` | `ProductsRead` | Listado/categorias, tarjetas, detalle, historial y facturas |
| `/articulos` | `articles/articles.routes` | `ProductsRead` | Catalogos y preparaciones |
| `/gestoria` | `DocGeneratorComponent` | `authGuard` | Gestion fiscal/documental |
| `/appcc` | `AppccComponent` | `authGuard` | Modulos APPCC con datos mayoritariamente internos/demo |
| `/rrhh` | `RrhhComponent` | `authGuard` | Area RRHH con estructura inicial/demo |
| `/miperfil` | `MyProfileComponent` | `authGuard` | Perfil de empresa/usuario, password/email |
| `/usuarios` | `UsersComponent` | `UsersRead`, `PermissionsAssign` | Gestion de usuarios y permisos |
| `/ventas` | `VentasComponent` | `authGuard` | Pantalla inicial/placeholder |
| `/auth/login` | `Login` | Publica | Login |
| `/auth/register` | `RegisterComponent` | Publica | Registro |
| `/notfound` | `Notfound` | Publica | Error 404 |

## Catalogo de Reutilizacion

### Componentes Compartidos

| Componente | Selector | Uso actual | Reutilizar cuando |
| --- | --- | --- | --- |
| `CardShellComponent` | `app-card-shell` | Cards de productos, proveedores y articulos | Crear tarjetas seleccionables de entidad |
| `DetailCardShellComponent` | `app-detail-card-shell` | Detalles de producto, proveedor, articulo y usuario | Crear paneles laterales/detalle con titulo y cierre |
| `ListShellComponent` | `app-list-shell` | Listas tabulares feature-locales | Envolver listas para mantener superficie y borde consistentes |
| `TablaDinamicaComponent` | `app-tabla-dinamica` | Tabla generica de facturas | Tablas con columnas configurables, acciones, seleccion, filtro global y export PDF |
| `IconComponent` | `app-icon` | Iconos Material Symbols en todo el layout/features | Cualquier icono visual; evita mezclar iconos ad hoc |
| `SkeletonComponent` | `app-skeleton` | Cargas en dashboard, productos, proveedores y usuarios | Estados de carga `single`, `grid` o `list` |
| `EmptyStateComponent` | `app-empty-state` | Estados vacios y placeholders | Listas vacias, modulos sin datos y coming soon |
| `Notfound` / `Empty` | `app-notfound`, `app-empty` | Pantallas auxiliares | Rutas auxiliares o fallback |

### Componentes de Layout

| Componente/servicio | Responsabilidad | Reutilizacion recomendada |
| --- | --- | --- |
| `AppLayout`, `AppMain` | Shell autenticado y contenedor principal | No duplicar layouts por feature |
| `SectionHeaderShellComponent` + `SectionHeaderService` | Slot de header contextual | Usar para cabeceras por seccion en vez de layouts locales incompatibles |
| `AppTopbar`, `TopbarShell`, `TopbarLeftWelcome`, `TopbarRightButtons` | Topbar responsive y acciones globales | Mantener acciones globales aqui |
| `AppSidebar`, `SidebarShell`, `SidebarMenu`, `SidebarChat`, `SidebarNotifications` | Navegacion desktop, chat y notificaciones | No crear sidebars feature-locales |
| `MobileBottomNav`, `MobileBottomSheet`, `MobileMenuModal` | Navegacion y overlays mobile | Reutilizar para experiencia mobile global |
| `LayoutService` | Estado de layout, menu, overlay y modo oscuro | Fuente unica para tema y layout global |

### Servicios Compartidos y Core

| Servicio | Capa | Responsabilidad |
| --- | --- | --- |
| `BaseHttpService` | Core | Helper para HTTP, endpoints y parametros |
| `AuthService` | Auth | Login, registro, tokens, refresh y logout |
| `ToastService` | Shared | Notificaciones y feed lateral |
| `ConfirmDialogService` | Shared | Confirmaciones con PrimeNG |
| `ModalService` | Shared | DynamicDialog tipado |
| `DocumentAnalysisService` | Core | Envio y seguimiento de analisis documental |
| `LanguageService` | Core | Preferencia de idioma |
| `ChatBubbleService` | Shared | Chat/agent sidebar y persistencia de conversacion |
| Servicios feature | Features | API especifica de usuarios, productos, proveedores, facturas, articulos, gestoria y empresa |

## Guia por Feature

| Feature | Objetivo | Piezas principales | Madurez | Mejora prioritaria |
| --- | --- | --- | --- | --- |
| `dashboard` | Entrada operativa y KPIs | `Dashboard`, `KpiSlot`, mock KPI service, charts | Media | Sustituir mock por API real y extraer paneles repetibles |
| `auth` | Login, registro y pantallas access/error | `Login`, `RegisterComponent`, `AuthService` | Media | Revisar almacenamiento de tokens y UX de errores |
| `invoices` | Facturas, subida y detalle | `InvoiceSummary`, `InvoiceDetail`, `AddInvoiceModal`, `InvoiceService` | Media-alta | Fortalecer tests y separar polling/analisis de UI |
| `products` | Productos, categorias, detalle e historico | `ProductosComponent`, list/card/detail, price chart | Media-alta | Reducir responsabilidad del componente raiz y consolidar mobile/detail patterns |
| `supplier` | Proveedores, detalle, compras y estadisticas | `SupplierComponent`, list/card/detail/contact/delivery/invoices/stats | Media-alta | Unificar patrones con productos y reforzar tipado/tests |
| `articles` | Articulos, catalogos y preparaciones | `ArticlesComponent`, cards, detail, modals, catalog/preparations | Media | Separar formularios grandes y estandarizar tablas/cards |
| `fiscal` | Gestoria, documentos fiscales, nominas y suministros | `DocGeneratorComponent`, gestor service, secciones internas | Media | Dividir template/componente grande en subcomponentes reutilizables |
| `users` | Gestion de usuarios/permisos | `UsersComponent`, `UserService`, permission interfaces | Media | Extraer formularios y matriz de permisos a componentes testeables |
| `enterprise` | Perfil de empresa/usuario | `MyProfileComponent`, `EnterpriseService` | Media | Validaciones y tests de formularios sensibles |
| `appcc` | Control APPCC | `AppccComponent`, section header | Baja-media | Conectar datos reales y extraer formularios/equipment cards |
| `rrhh` | Recursos humanos | `RrhhComponent`, section header | Baja | Definir modelo/API real y reemplazar datos placeholder |
| `ventas` | Ventas | `VentasComponent`, section header | Baja | Definir alcance funcional antes de implementar UI compleja |

## Patrones Actuales

### UI y Tema

- Usar PrimeNG para componentes con comportamiento: tablas, dialogos, selects, charts, botones, file upload, toasts y confirm dialogs.
- Usar Tailwind para layout y ajustes locales.
- Usar `mg-*` para superficies y patrones repetidos: `mg-surface`, `mg-surface-muted`, `mg-text`, `mg-text-muted`, `mg-dashboard-card`, `mg-feature-card`, `mg-drawer-*`, `mg-bottom-sheet`, `mg-mobile-fab`, `mg-topbar-*`, `mg-sidebar-*`.
- Modo oscuro: `.app-dark` en `document.documentElement`, gestionado por `LayoutService`, con tokens PrimeNG/Tailwind PrimeUI.
- Evitar `bg-white`, `text-gray-*`, `border-gray-*` y hexadecimales de marca en superficies estructurales.
- Mantener `group` explicito en templates cuando se use `group-hover`.

### Datos y Estado

- Servicios API de feature suelen extender `BaseHttpService`.
- Componentes modernos usan `takeUntilDestroyed` para suscripciones.
- Hay signals en varias pantallas; conviene seguir usandolas para estado local nuevo.
- `TablaDinamica` emite `unknown`; las features deben hacer type guards o estrechar tipos antes de operar.
- Errores de usuario deben ir a `ToastService`, estado inline o interceptores; no a consola.

### Permisos

- Rutas protegidas con `ngxPermissionsGuard` usan `AppPermission`.
- UI visible por permisos usa `NgxPermissionsModule` en secciones concretas.
- Cualquier feature nueva con permisos debe definir permiso en `AppPermission`, proteger ruta y condicionar acciones de UI.

## Auditoria de Mejora

### Hallazgos Confirmados

- El proyecto tiene 211 archivos TS/HTML/SCSS/CSS bajo `src/app`.
- Solo existen 4 specs: productos, perfil, fiscal y tabla dinamica.
- Hay varias features maduras visualmente, pero con logica aun concentrada en componentes grandes.
- Hay duplicacion conceptual entre productos/proveedores/articulos: card, list, detail, section header, mobile detail y empty/loading.
- Algunas areas (`appcc`, `rrhh`, `ventas`, parte de dashboard) parecen tener datos placeholder o alcance inicial.
- Persisten tokens y preferencias en `localStorage`; esto es practico, pero debe revisarse para seguridad de auth.
- Existen suscripciones manuales en chat/sidebar/mobile bottom sheet y polling de facturas; algunas estan controladas con `unsubscribe`, pero conviene migrar gradualmente a `takeUntilDestroyed` o servicios.
- ESLint esta operativo, pero la propia documentacion del proyecto reconoce reglas relajadas por deuda de accesibilidad en templates.

### Riesgos por Severidad

| Severidad | Riesgo | Impacto | Accion recomendada |
| --- | --- | --- | --- |
| Alta | Baja cobertura de tests | Regresiones silenciosas en auth, facturas, permisos y UI compartida | Crear plan de tests por capas |
| Alta | Tokens auth en `localStorage` | Exposicion ante XSS y persistencia excesiva | Revisar estrategia con backend |
| Media-alta | Componentes grandes por feature | Dificulta mantenimiento, testing y reutilizacion | Extraer subcomponentes por flujo |
| Media-alta | Duplicacion UI entre features | Inconsistencia visual y coste alto de cambios | Consolidar shells y patrones |
| Media | Accesibilidad parcial | Riesgo UX/legal y deuda de template lint | Endurecer reglas por fases |
| Media | Areas mock/demo | Confusion sobre estado real del producto | Marcar claramente demo vs productivo |
| Media | Chart/theme manual | Posibles fallos en modo oscuro | Centralizar helpers de chart theme |
| Baja-media | Documentacion dispersa | Perdida de contexto al retomar el proyecto | Mantener README/AGENTS/auditoria actualizados |

## Roadmap Priorizado

### Fase 1: Comprension y Estabilizacion

- Mantener esta auditoria como mapa de entrada.
- Confirmar que `npm run format:check`, `npm run lint -- --max-warnings=0` y `npx tsc --noEmit -p tsconfig.app.json` pasan antes de refactors.
- Separar cambios pendientes actuales en commits coherentes antes de empezar nuevos bloques.
- Etiquetar features como productivas, beta o placeholder.

### Fase 2: Estandarizacion UI

- Mantener `docs/ui-patterns-guide.md` como guia corta de patrones UI para desktop/tablet.
- Sustituir superficies locales por `mg-*` donde falte.
- Unificar section headers de productos, proveedores, articulos, fiscal, appcc, rrhh y ventas.
- Dejar mobile fuera de alcance hasta definir la estrategia responsive definitiva.

### Fase 3: Refactorizacion Reutilizable

- Extraer patrones comunes de productos/proveedores/articulos.
- Dividir componentes grandes: fiscal, productos, supplier, articles preparations y users.
- Crear helpers o servicios para chart theme, filtros, type guards y transformaciones repetidas.
- Convertir formularios complejos en componentes presentacionales testeables.

### Fase 4: Testing

- Prioridad 1: `AuthService`, interceptores, guards y permisos.
- Prioridad 2: `BaseHttpService`, servicios de facturas/productos/proveedores/usuarios.
- Prioridad 3: `TablaDinamica`, shells compartidos, formularios y modales.
- Prioridad 4: flujos principales de facturas, productos, proveedores y usuarios.

### Fase 5: Hardening

- Revisar estrategia de auth tokens y session management.
- Endurecer ESLint de accesibilidad por grupos de reglas.
- Auditar HTML dinamico y entradas no confiables.
- Validar visualmente light/dark y responsive en pantallas criticas.

## Checklist para Crear una Feature Nueva

- Definir ruta y permisos en `app.routes.ts` o route file de feature.
- Crear carpeta feature con componente raiz, componentes internos, servicios e interfaces locales.
- Reutilizar `CardShell`, `DetailCardShell`, `ListShell`, `EmptyState`, `Skeleton`, `Icon` y `mg-*` antes de crear variantes.
- Usar PrimeNG para controles complejos y Tailwind para layout.
- Extender `BaseHttpService` si hay API.
- Usar `takeUntilDestroyed`, `async` pipe o signals para streams.
- Cubrir estados: loading, empty, error, success, sin permisos, mobile y dark mode.
- Anadir specs para servicios, transformaciones y componentes compartidos o complejos.
- Actualizar `README.md`, `AGENTS.md` o esta auditoria si cambia el patron general.

## Verificaciones Recomendadas

```bash
npm run format:check
npm run lint -- --max-warnings=0
npx tsc --noEmit -p tsconfig.app.json
rg -n 'console\.|\bany\b' src/app --glob '*.{ts,html}'
```

Para cambios visuales, validar al menos:

- Dashboard.
- Facturas resumen y detalle.
- Productos list/card/detail.
- Proveedores list/card/detail.
- Usuarios.
- Login.
- Mobile y desktop.
- Modo claro y oscuro.

## Estado del Working Tree al Redactar Esta Auditoria

Antes de esta documentacion ya existian cambios pendientes en:

- `src/app/features/auth/pages/login/login.component.html`
- `src/app/features/fiscal/fiscal.component.html`
- `src/app/features/invoices/pages/invoice-summary/invoice-summary.component.html`
- `src/app/features/products/productos.component.html`
- `src/app/features/supplier/components/supplier-detail/components/supplier-delivery/supplier-delivery.component.html`
- `tsconfig.json`

Esta auditoria no debe reinterpretar esos cambios como parte de un refactor nuevo. Antes de continuar con mejoras, conviene revisarlos y commitearlos o descartarlos de forma consciente.
