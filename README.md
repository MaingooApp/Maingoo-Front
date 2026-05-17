# Maingoo Front

Frontend de Maingoo, una aplicacion SaaS para gestion operativa de negocio. La aplicacion esta desarrollada con Angular 19, Tailwind CSS y PrimeNG, siguiendo una arquitectura por features con componentes standalone.

## Stack principal

- Angular 19 con TypeScript estricto y componentes standalone.
- Tailwind CSS 3 con `tailwindcss-primeui`.
- PrimeNG 19 con `@primeng/themes`, preset Aura, `primeicons` y traducciones en espanol.
- RxJS, Angular Router, Angular Service Worker y `ngx-translate`.
- Jasmine/Karma para unit tests.

## Estructura del proyecto

- `src/app/features`: funcionalidades de producto, como `auth`, `dashboard`, `fiscal`, `invoices`, `products`, `supplier`, `users` y `ventas`.
- `src/app/shared`: componentes, servicios, interfaces y helpers reutilizables entre features.
- `src/app/core`: servicios base, interceptores, guards, constantes, enums, pipes e interfaces transversales.
- `src/app/layout`: shell principal, topbar, sidebar, navegacion movil y configurador visual.
- `src/assets` y `public`: assets, i18n y recursos estaticos.
- `src/styles.scss`, `src/tailwind.css` y `tailwind.config.js`: entrada global de estilos, Tailwind y tokens de UI.

## Comandos

```bash
npm install
npm start
npm run build
npm run watch
npm test
npm run format
npm run format:check
```

- `npm start`: levanta el servidor Angular en configuracion de desarrollo.
- `npm run build`: genera build de produccion en `dist/OmniAI`.
- `npm run watch`: build continuo en modo desarrollo.
- `npm test`: ejecuta unit tests con Karma/Jasmine.
- `npm run format`: aplica Prettier.
- `npm run format:check`: comprueba formato sin modificar archivos.

## Arquitectura y convenciones

- Usa componentes standalone y carga lazy cuando la feature lo permita.
- Mantiene cada feature autocontenida; mueve codigo a `shared` solo si se reutiliza en mas de una feature.
- Centraliza acceso HTTP en servicios y usa los interceptores existentes: `base-http.service.ts`, `auth.interceptor.ts` y `http-error.interceptor.ts`.
- Prefiere interfaces tipadas en `core/interfaces` o `features/**/interfaces` antes que objetos anonimos o `any`.
- Reutiliza shells y componentes compartidos antes de crear nuevas variantes visuales.
- Evita duplicar hosts globales de PrimeNG como `p-toast` y `p-confirmDialog`; deberian vivir en un unico punto global salvo una razon clara.
- Mantiene patrones consistentes para tablas, formularios, dialogs, confirmaciones, botones, estados vacios y skeletons.

## UI, Tailwind y PrimeNG

PrimeNG esta configurado en `src/app/app.config.ts` con `providePrimeNG`, tema Aura, traduccion ES y dark mode mediante `.app-dark`. Tailwind extiende la marca Maingoo en `tailwind.config.js` y usa `tailwindcss-primeui` para convivir con tokens de PrimeNG.

Al crear UI nueva:

- Usa componentes PrimeNG cuando aporten accesibilidad, comportamiento o consistencia.
- Usa Tailwind para layout y ajustes visuales locales.
- Usa SCSS de componente solo cuando Tailwind/PrimeNG no sean suficientes.
- Implementa el modo oscuro con tokens PrimeNG/Tailwind PrimeUI: `surface-*`, `primary`, `primary-emphasis`, `primary-contrast`, `border-surface` y utilidades `mg-*`.
- Evita clases rigidas para superficies estructurales como `bg-white`, `text-gray-*`, `bg-gray-*`, `border-gray-*` o colores hexadecimales de marca.
- Mantiene accesibilidad: `aria-label` en botones icon-only, foco visible, teclado y contraste.
- Consulta el MCP de PrimeNG cuando haya dudas sobre APIs, templates, theming, eventos o componentes.

## MCP PrimeNG

El MCP de PrimeNG se usa como ayuda de desarrollo para consultar APIs, componentes, theming y patrones PrimeNG. No es una dependencia de runtime ni debe instalarse en `package.json`.

Para uso local en editores compatibles se puede crear `.vscode/mcp.json`:

```json
{
  "servers": {
    "primeng": {
      "command": "npx",
      "args": ["-y", "@primeng/mcp"]
    }
  }
}
```

Para Codex, se activa desde la configuracion global del usuario:

```toml
[mcp_servers.primeng]
command = "npx"
args = ["-y", "@primeng/mcp"]
```

Paquete verificado: `@primeng/mcp` version `21.1.7`.

## Estado de auditoria tecnica

Estado actual esperado:

- `npx tsc --noEmit -p tsconfig.app.json`: debe pasar.
- `npx tailwindcss -i src/tailwind.css -o /tmp/maingoo-tailwind.css --config tailwind.config.js`: debe pasar.
- `npx eslint . --max-warnings=0`: falla porque `eslint.config.js` usa claves legacy incompatibles con ESLint 9 flat config.
- Solo existen 4 specs frente a mas de 200 archivos TS/HTML/SCSS.

Riesgos prioritarios:

- Corregir ESLint y anadir script `lint`.
- Retirar `console.log` de flujos sensibles.
- Revisar estrategia de tokens en `localStorage`.
- Reducir `any` en servicios, tablas, charts y DTOs.
- Aumentar tests en auth, interceptores, servicios core, tablas, facturas, productos, proveedores y usuarios.
- Mantener la UI alineada con tokens PrimeNG y componentes reutilizables.

## Objetivo de calidad

El objetivo del frontend es evolucionar hacia una base profesional, documentada y facil de mantener:

- Componentes reutilizables antes que pantallas duplicadas.
- Patrones estandarizados para UI, datos, errores, permisos y formularios.
- Documentacion centralizada en `README.md` y `AGENTS.md`.
- Cambios pequenos, verificables y alineados con Angular, Tailwind y PrimeNG.

## Pull requests

Los PRs deben incluir resumen, notas de test, capturas o grabaciones si hay cambios visuales, y cualquier impacto de configuracion, entorno o migracion.
