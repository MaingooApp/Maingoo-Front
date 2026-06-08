# Guia Corta de Patrones UI

## Objetivo

Definir el estandar visual vigente para construir pantallas desktop/tablet en Maingoo Front. Esta guia cubre colores, superficies, tipografia, bordes, radios, sombras, espaciado, estados y componentes reutilizables.

Mobile queda fuera de alcance por ahora. No crear ni documentar nuevos patrones mobile hasta decidir la estrategia responsive definitiva.

## Principios

- PrimeNG es la base para componentes interactivos y accesibles.
- Tailwind organiza layout, espaciado y ajustes visuales.
- `tailwindcss-primeui` conecta Tailwind con tokens PrimeNG.
- Las utilidades `mg-*` de `src/tailwind.css` son el estandar para superficies reutilizables.
- Evitar estilos locales si el patron ya existe en `shared`, `layout` o `mg-*`.
- Mantener modo claro/oscuro desde tokens, no desde colores fijos.

## Colores

### Fuente de Verdad

| Uso | Token/clase recomendada | Evitar |
| --- | --- | --- |
| Fondo principal | `bg-surface-50`, `bg-surface-0`, `dark:bg-surface-950`, `dark:bg-surface-900` | `bg-white`, `bg-gray-*` |
| Superficie de tarjeta/panel | `mg-surface`, `bg-surface-0 dark:bg-surface-900` | Hexadecimales directos |
| Superficie secundaria | `mg-surface-muted`, `bg-surface-50 dark:bg-surface-800` | Grises Tailwind no tokenizados |
| Texto principal | `mg-text`, `text-surface-900 dark:text-surface-0` | `text-black`, `text-gray-*` |
| Texto secundario | `mg-text-muted`, `text-surface-500 dark:text-surface-400` | Opacidades manuales inconsistentes |
| Borde | `border-surface`, `border border-surface` | `border-gray-*` |
| Accion primaria | `text-primary`, `bg-primary`, `hover:bg-primary-emphasis` | Color de marca hardcoded |
| Texto sobre primario | `text-primary-contrast` | `text-white` en botones primarios |

### Marca

`tailwind.config.js` define estos colores de marca:

| Token | Valor | Uso recomendado |
| --- | --- | --- |
| `maingoo.deep` | `#1A3C34` | Referencia de marca, no como color estructural directo |
| `maingoo.sage` | `#6B9E86` | Apoyos visuales puntuales |
| `maingoo.mint` | `#F0F7F4` | Fondos suaves puntuales |

Preferir `primary`, `primary-emphasis` y `primary-contrast` sobre `maingoo.*` para UI de producto, porque se integran mejor con PrimeNG y modo oscuro.

### Colores Semanticos

- Exito: `green-*` solo para estados positivos confirmados.
- Error/destructivo: `red-*` solo para errores, acciones destructivas y logout.
- Aviso: `amber-*` solo para advertencias, beta, coming soon o pendientes.
- Informativo: usar `primary` por defecto; `blue-*` solo si el dominio visual lo justifica.

Los colores semanticos deben incluir variante dark cuando aparezcan sobre superficies: ejemplo `bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400`.

## Modo Oscuro

- La clase global `.app-dark` se aplica en `document.documentElement`.
- PrimeNG usa `darkModeSelector: '.app-dark'`.
- `LayoutService` es la fuente de verdad del estado `darkTheme`.
- Componentes nuevos deben funcionar con tokens `surface-*`, `text-surface-*`, `border-surface`, `primary`, `primary-emphasis` y `primary-contrast`.
- `dark:` se permite para ajustes locales, pero no debe reemplazar el sistema de tokens.
- Graficas y widgets externos deben leer variables CSS de PrimeNG con `getComputedStyle(document.documentElement)`.

## Tipografia

### Jerarquia Recomendada

| Elemento | Clases recomendadas | Uso |
| --- | --- | --- |
| Titulo de pagina/seccion | `text-2xl font-bold mg-text m-0` | Cabeceras principales de feature |
| Titulo de panel/detalle | `text-xl font-bold mg-text m-0 truncate` | `DetailCardShell` y paneles laterales |
| Titulo de card | `text-sm font-semibold mg-text` o `font-bold mg-text` | Cards/list items |
| Texto normal | `text-sm mg-text` | Contenido de formularios/listas |
| Texto secundario | `text-xs mg-text-muted` o `text-sm mg-text-muted` | Metadatos, ayudas y subtitulos |
| Etiqueta de formulario | `text-sm font-medium mg-text` | Labels |
| Microcopy tecnico | `text-[11px] mg-text-muted font-mono` | IDs, codigos o permisos |

### Reglas

- No usar texto hero en pantallas operativas.
- Evitar `tracking-*` salvo etiquetas uppercase pequeñas.
- Mantener titulos con `m-0` cuando esten dentro de shells o flex layouts.
- Usar `truncate`, `min-w-0` y `title` cuando el texto pueda crecer.

## Espaciado y Layout

### Escala Base

| Patron | Clases recomendadas |
| --- | --- |
| Separacion entre bloques principales | `gap-6` |
| Separacion interna de tarjetas | `p-4`, `gap-3` |
| Paneles de detalle | `px-6 py-6` |
| Header de panel | `px-6 py-4` |
| Footer de panel | `p-4 gap-2` o `p-4 gap-3` |
| Formularios | `flex flex-col gap-5` o campos con `gap-1.5`/`gap-2` |
| Grids de cards | `grid ... gap-6` |
| Acciones compactas | `gap-1`, `gap-2`, `w-8 h-8` |

### Reglas

- Pantallas principales deben usar contenedores flex/grid predecibles, no offsets locales complejos.
- Evitar duplicar `p-6 -m-6` en nuevas features si se puede resolver desde shell/layout.
- Mantener `overflow-hidden` en shells y `overflow-y-auto` solo en zonas de contenido scrollable.
- No crear layouts mobile nuevos en esta fase.

## Bordes, Radios y Sombras

### Radios

| Uso | Clase |
| --- | --- |
| Superficies estructurales | `rounded-content` |
| Inputs y controles locales | `rounded-lg` |
| Botones icon-only circulares | `rounded-full` |
| Pills/badges | `rounded-full` |
| Ilustraciones circulares | `rounded-full` |

`rounded-content` usa `var(--content-border-radius)`. Debe ser el radio por defecto para cards, paneles y contenedores de feature.

Evitar radios inline grandes como `style="border-radius: 53px"` en nuevas pantallas; si un radio especial se consolida, convertirlo en token/utilidad.

### Bordes

- Usar `border border-surface` para superficies.
- Usar `border-b border-surface` en headers internos.
- Usar `border-t border-surface` en footers.
- Usar `hover:border-primary` o `hover:border-primary/30` para items seleccionables.
- Usar `ring-1 ring-transparent hover:ring-primary` cuando interese una seleccion mas visible sin mover layout.

### Sombras

| Uso | Clase |
| --- | --- |
| Card normal | `shadow-sm` |
| Hover card | `hover:shadow-md` o `hover:shadow-lg` |
| Panel flotante/detalle | `shadow-2xl` |
| Topbar/chips sutiles | Sombras existentes `mg-topbar-*` y `mg-sidebar-*` |

No crear sombras custom nuevas salvo necesidad clara. Si se repiten, moverlas a `src/tailwind.css`.

## Componentes y Patrones

### Cards de Entidad

Usar `CardShellComponent` o `mg-feature-card`.

Estandar:

- Superficie: `mg-surface`.
- Radio: `rounded-content`.
- Sombra: `shadow-sm`, hover `shadow-lg`.
- Seleccion: `ring-primary` o `ring-2 ring-primary border-primary`.
- Padding interno: `p-4`.
- Gap interno: `gap-3`.

### Listas

Usar `ListShellComponent` para el contenedor y PrimeNG `p-table` o filas propias segun complejidad.

Estandar:

- Contenedor: `mg-surface rounded-content shadow-sm overflow-hidden`.
- Filas: `hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors`.
- Acciones: botones icon-only con `aria-label`.
- Texto: `mg-text` y `mg-text-muted`.

### Paneles de Detalle

Usar `DetailCardShellComponent`.

Estandar:

- Header: `bg-surface-50 dark:bg-surface-800 px-6 py-4 border-b border-surface`.
- Body: `bg-surface-0 dark:bg-surface-900 px-6 py-6`.
- Footer: `mg-panel-footer` cuando haya acciones persistentes.
- Cierre: boton circular `w-8 h-8 rounded-full`.

### Formularios

Estandar:

- Campo: `flex flex-col gap-1.5` o `gap-2`.
- Label: `text-sm font-medium mg-text`.
- Input: `w-full border-surface rounded-lg focus:border-primary focus:ring-primary`.
- Error: `text-xs text-red-500` o bloque `bg-red-50 dark:bg-red-900/20`.
- Acciones: footer o fila `flex justify-end gap-2`.

Preferir componentes PrimeNG para selects, input number, file upload, tabs y dialogs.

### Dialogos y Confirmaciones

- Confirmaciones: `ConfirmDialogService`.
- Dialogs dinamicos: `ModalService`.
- No duplicar `p-confirmDialog` ni `p-toast` en features.
- Los botones destructivos deben usar severidad/clases danger y copy explicito.

### Estados Empty y Loading

- Empty: `EmptyStateComponent`.
- Loading: `SkeletonComponent`.
- Ilustracion vacia: `mg-empty-illustration`.
- Evitar spinners sueltos si la pantalla puede usar skeletons.

### Tablas

- Usar `TablaDinamicaComponent` si encaja con columnas configurables, acciones, seleccion, filtro global o export PDF.
- Usar PrimeNG `p-table` feature-local si la tabla tiene estructura muy especifica.
- Mantener headers `text-sm font-bold mg-text`.
- Mantener celdas compactas y acciones agrupadas con `gap-2`.

### Badges y Pills

- Principal: `mg-feature-pill`.
- Secundario: `mg-feature-pill-muted`.
- Demo/placeholder: `mg-demo-badge`.
- Semanticos: usar colores `green`, `amber`, `red` con variante dark.

## Iconos y Botones

### Iconos

- Usar `IconComponent` (`app-icon`) para Material Symbols.
- Tamanos frecuentes:
  - `sm` para acciones compactas.
  - `md` para botones e inputs.
  - `xl` para cards o encabezados.
  - `4xl`/`5xl`/`6xl` solo para empty states.
- Evitar mezclar `pi pi-*` en UI nueva salvo que el componente PrimeNG lo requiera.

### Botones

- Usar PrimeNG `pButton`/`p-button` para acciones reales.
- Botones icon-only siempre con `aria-label` o tooltip.
- Acciones primarias: `p-button-primary` o `bg-primary text-primary-contrast`.
- Acciones secundarias: `p-button-secondary`, `p-button-text` o superficies tokenizadas.
- Acciones destructivas: `p-button-danger` o rojo semantico.

## Animacion e Interaccion

- Transiciones base: `transition-colors`, `transition-all duration-200/300`.
- Cards: hover con sombra/ring, no cambios bruscos de tamano.
- Animaciones globales disponibles:
  - `animate-slide-up`
  - `animate-slide-left`
  - `animate-slide-in-right`
  - `animate-notification-pulse`
- No anadir animaciones inline repetidas; moverlas a `tailwind.config.js` si se consolidan.

## Accesibilidad

- Botones icon-only con `aria-label`.
- Inputs con `label` visible o asociacion accesible.
- Foco visible con `focus-visible:outline-*` o estilos PrimeNG.
- No depender solo de color para estados criticos.
- Contraste validado en claro y oscuro.
- Textos truncados deben conservar informacion mediante `title` o detalle accesible si la informacion es importante.

## Deuda UI Detectada

- Hay radios especiales inline en pantallas auxiliares (`notfound`, `auth error/access`) que no son estandar.
- Algunas features iniciales usan colores locales (`blue-*`, `orange-*`) sin variante dark completa.
- Hay patrones repetidos de section header entre features.
- Productos/proveedores/articulos comparten estructura de card/list/detail y pueden converger mas.
- Mobile existe en varias piezas, pero queda fuera de esta guia hasta definir estrategia.

## Checklist para UI Nueva

- Usa componente compartido si existe.
- Usa `mg-*` para superficies y texto.
- Usa `rounded-content` para contenedores.
- Usa `border-surface` para divisores y bordes.
- Usa `shadow-sm` y hover `shadow-md`/`shadow-lg`.
- Usa `primary`/`primary-emphasis`/`primary-contrast` para acciones principales.
- Verifica modo claro y oscuro.
- Incluye loading, empty y error.
- Incluye `aria-label` en icon-only.
- No implementes patron mobile nuevo en esta fase.
