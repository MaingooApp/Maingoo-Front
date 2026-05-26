# Repository Guidelines

## Project Identity

Maingoo Front is the Angular frontend for Maingoo, a SaaS application for business operations. The frontend is based on Angular 19, Tailwind CSS and PrimeNG. The long-term goal is to make this codebase professional, maintainable and well documented, with strong reuse of components and standardized UI/data patterns.

## Technology Stack

- Angular 19 with standalone components and strict TypeScript.
- Tailwind CSS 3 for layout, spacing and utility styling.
- PrimeNG 19 for UI primitives, overlays, forms, tables, charts and theming.
- `@primeng/themes` with Aura preset and `.app-dark` dark mode selector.
- `tailwindcss-primeui` to align Tailwind utilities with PrimeNG tokens.
- `ngx-translate` for i18n and `ngx-permissions` for permission gates.
- Jasmine/Karma for unit tests.

## Project Structure

- `src/app/features`: routeable product areas such as `auth`, `dashboard`, `fiscal`, `invoices`, `products`, `supplier`, `users`, `ventas`, `appcc`, `articles`, `enterprise` and `rrhh`.
- `src/app/shared`: reusable components, services, interfaces and helpers used by more than one feature.
- `src/app/core`: cross-cutting services, guards, interceptors, constants, enums, pipes and interfaces.
- `src/app/layout`: application shell, topbar, sidebar, mobile navigation and layout services.
- `src/assets`: i18n files, layout styles and static assets.
- `public`: public static files.
- `src/styles.scss`, `src/tailwind.css` and `tailwind.config.js`: global style entrypoints and design tokens.

## Architecture Audit

Before proposing large refactors, new shared patterns or new feature architecture, read `docs/frontend-architecture-audit.md`. Treat it as the current onboarding map for routes, feature maturity, reusable components, shared services, UI standards, known debt and improvement roadmap.

Before changing UI standards, read `docs/ui-patterns-guide.md`. It is the current source for desktop/tablet colors, surfaces, typography, border radius, borders, shadows, spacing, states and reusable UI patterns. Do not introduce new mobile patterns until the mobile strategy is defined.

## Development Commands

- `npm start`: run the Angular dev server with development configuration.
- `npm run build`: create a production build in `dist/OmniAI`.
- `npm run watch`: build continuously using the development configuration.
- `npm run lint`: run ESLint flat config for Angular, TypeScript and templates.
- `npm test`: run Karma/Jasmine unit tests.
- `npm run format`: format the repository with Prettier.
- `npm run format:check`: verify formatting without writing changes.

Install dependencies with `npm install` and keep `package-lock.json` committed when dependencies change.

## PrimeNG MCP

PrimeNG MCP is an optional local development helper for PrimeNG APIs, components, templates, events, theming and accessibility. It is not a runtime dependency and should not be added to `package.json`.

For compatible editors, a developer can create a local `.vscode/mcp.json`:

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

Codex can use it when the user-level Codex MCP config contains:

```toml
[mcp_servers.primeng]
command = "npx"
args = ["-y", "@primeng/mcp"]
```

Use PrimeNG MCP whenever implementing or reviewing PrimeNG components, properties, events, templates, theming, accessibility or migration details. Prefer MCP-backed PrimeNG guidance over memory when the API shape matters.

## Coding Standards

- Follow Angular standalone patterns already present in the repo.
- Use TypeScript interfaces from `core/interfaces` or feature-local `interfaces` folders instead of ad hoc object shapes.
- Do not introduce explicit `any`. Use domain interfaces, `unknown`, generics or small local types instead.
- Do not leave `console.*` calls in application code. Surface errors through toasts, UI state, interceptors or typed return values.
- Keep feature-specific code inside its feature folder.
- Move code to `shared` only after it is reused by multiple features.
- Use SCSS for component-specific styling only when Tailwind and PrimeNG classes are not enough.
- Keep comments short and useful; avoid comments that restate obvious code.
- Do not commit secrets, tokens or production-only credentials.

## UI and Component Reuse

- Reuse shared shells and components before creating new UI variants.
- Prefer PrimeNG components for accessible, stateful UI such as tables, dialogs, confirms, toasts, selects, checkboxes, charts, file uploads, tooltips and buttons.
- Use Tailwind for layout, responsive behavior and small visual adjustments.
- Current shared UI helpers live in `src/tailwind.css`. Prefer them for recurring surfaces, text, cards, panels, mobile sheets, FABs, topbar/sidebar actions, pills and demo badges.
- Keep `group` explicit in templates when a helper relies on `group-hover`; do not hide Tailwind's `group` utility inside `@apply`.
- New features should compose these helpers with PrimeNG components instead of reintroducing local color systems.
- Keep buttons, filters, tables, dialogs, detail panels, empty states and skeletons visually consistent across features.
- Use global Tailwind animations from `tailwind.config.js` (`animate-slide-up`, `animate-slide-left`, `animate-slide-in-right`) instead of local inline `<style>` blocks for repeated transitions.
- Avoid duplicating global overlay hosts. `p-toast` and `p-confirmDialog` should normally live at app level, not in individual feature pages.
- When creating a reusable component, document its inputs/outputs through clear typing and simple naming.
- Make icon-only controls accessible with labels or tooltips and keyboard-safe focus behavior.

## Dark Mode Implementation Rules

Dark mode is implemented through PrimeNG theming. Treat PrimeNG tokens and the `.app-dark` selector as the source of truth.

- `src/app/app.config.ts` configures PrimeNG Aura with `darkModeSelector: '.app-dark'`.
- `LayoutService` owns `layoutConfig().darkTheme`, applies/removes `.app-dark` on `document.documentElement` and persists the preference in `localStorage` as `maingoo.darkTheme`.
- Do not create feature-local theme state, duplicated dark-mode toggles or parallel color maps.
- For structural UI, prefer `surface-*`, `text-surface-*`, `border-surface`, `primary`, `primary-emphasis`, `primary-contrast` and shared `mg-*` helpers.
- Avoid hardcoded light-only classes such as `bg-white`, `text-gray-*`, `bg-gray-*`, `border-gray-*` and brand hex colors on containers, cards, panels, overlays and navigation.
- `dark:` variants are acceptable only for local adjustments. They must not replace PrimeNG/Tailwind PrimeUI tokens for the main surface system.
- New cards, panels and feature containers should start from existing helpers such as `mg-surface`, `mg-text`, `mg-text-muted`, `mg-dashboard-card`, `mg-feature-card`, `mg-detail-card`, `mg-mobile-sheet`, `mg-sidebar-*` or `mg-topbar-*` where applicable.
- Charts or third-party widgets must read current theme values from PrimeNG CSS variables with `getComputedStyle(document.documentElement)`. Guard browser-only access when code can run before the DOM exists.
- Validate visible UI changes in light mode, dark mode, mobile width and desktop width.

## Current Standardization Baseline

- `src/tailwind.css` centralizes reusable `mg-*` utilities for theme-aware UI patterns.
- `tailwind.config.js` centralizes Maingoo colors, shadows, z-index values and repeated animations.
- Templates keep Tailwind `group` explicit where `group-hover` is used.
- Global PrimeNG overlay hosts such as `p-toast` and `p-confirmDialog` should live at app level.
- `src/app` should contain no explicit `any` and no `console.*`.
- HTTP subscriptions in components should use `takeUntilDestroyed`, `async` pipe or signals.
- Generic shared component outputs should use `unknown` or generics; feature code should narrow the value with type guards.
- User-facing errors should be represented by toasts, inline state or shared error services, not logs.
- New feature UI should reuse PrimeNG components and shared helpers before adding local SCSS or new utility chains.

## Architecture Principles

- Route API access through existing core services and interceptors, especially `base-http.service.ts`, `auth.interceptor.ts` and `http-error.interceptor.ts`.
- Keep auth, permissions, HTTP error handling and environment configuration centralized.
- Keep heavy data transformation out of templates. Prefer typed helpers, computed signals or feature services.
- Use RxJS subscriptions carefully. Prefer `takeUntilDestroyed`, `async` pipe or signals for long-lived streams.
- HTTP subscriptions inside components should use `takeUntilDestroyed` unless they are one-shot flows already handled by a shared service or modal lifecycle.
- Avoid mixing business rules into visual-only components.
- Keep dialogs/modals behind shared services or consistent feature patterns.
- Preserve lazy loading where route boundaries make sense.

## Testing Guidelines

- Unit tests use Jasmine and Karma through Angular CLI.
- Place specs next to implementation files as `*.spec.ts`.
- Add tests for new shared components, services, pipes and non-trivial feature logic.
- Prioritize tests for auth, interceptors, core services, permission checks, invoice upload/analysis, tables, products, suppliers, users and dashboard transformations.
- Run `npm test` before opening a PR when feasible.
- Remove `fdescribe` and `fit` before committing.

## Current Audit Baseline

Current expected baseline:

- `npx tsc --noEmit -p tsconfig.app.json` passes.
- `npx tailwindcss -i src/tailwind.css -o /tmp/maingoo-tailwind.css --config tailwind.config.js` passes.
- `npm run lint -- --max-warnings=0` passes.
- `npm run format:check` passes.
- `rg -n 'console\.|\bany\b' src/app --glob '*.{ts,html}'` should return no matches.
- Test coverage is low: only 4 specs exist for a large frontend.
- Known debt includes relaxed ESLint rules for existing template accessibility issues, token persistence in `localStorage`, limited automated visual coverage and low unit-test coverage.

Treat these as known baseline issues. Do not hide new regressions inside broad cleanup unless the user explicitly asks for a cleanup pass.

## Documentation Rules

- Keep durable project documentation in `README.md` and operational agent guidance in `AGENTS.md`.
- Keep both `README.md` and `AGENTS.md` as up-to-date as possible whenever the repository structure, stack, commands, conventions or known baseline changes.
- Keep both files concise and practical. They are current guides, not changelogs or historical logs.
- When something changes, update the documented current state and remove outdated information instead of preserving old versions for context.
- Avoid creating extra Markdown files unless they have a clear long-term purpose, such as legal, PR templates or release notes.
- If a temporary audit or integration note becomes useful long term, merge it into `README.md` or `AGENTS.md`.
- Keep documentation aligned with the actual repo state. Verify commands and paths before documenting them.

## Commit and Pull Request Guidelines

Use Conventional Commit-style messages:

- `feat:` for new user-facing behavior.
- `fix:` for bug fixes.
- `refactor:` for internal structure changes without intended behavior changes.
- `style:` for formatting or visual-only code changes.
- `docs:` for documentation-only changes.
- `test:` for test additions or updates.
- `chore:` for tooling, config or maintenance.

Commit standards:

- Use concise, imperative English or Spanish consistently in a branch, for example `feat: add supplier filters` or `fix: corregir modo oscuro en dashboard`.
- Add a scope when it clarifies ownership, for example `fix(dashboard): align cards with PrimeNG dark tokens`.
- Keep one coherent purpose per commit. Do not mix broad formatting, refactors and feature work unless the user explicitly asks for a single combined commit.
- Before committing, check `git status --short` and make sure every staged file belongs to the requested change.
- Update `README.md` and `AGENTS.md` in the same commit when the current project guidance, commands, stack, architecture or standards change.
- Do not commit local/private files such as editor MCP configuration unless the team intentionally decides to share them.
- Include verification in the PR or handoff notes, especially `tsc`, Tailwind build, tests, format and any visual checks that were actually run.

Pull requests should include a short summary, linked issue or task when available, test notes and screenshots or recordings for visible UI changes. Call out configuration, environment or migration impacts explicitly.

## Security and Configuration

- Environment files live in `src/environments`.
- Do not commit secrets, tokens or production-only credentials.
- Review logs before committing; `console.*` should not be used in `src/app`.
- Token storage in `localStorage` is a known risk. Prefer a stronger session strategy when backend support allows it.
- Treat chat/document HTML as untrusted unless it is explicitly sanitized and controlled.
