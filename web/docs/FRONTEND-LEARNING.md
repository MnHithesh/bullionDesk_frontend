# BullionDesk Web — Frontend Learning Log

A running log for an Angular developer learning React. One entry per build step.

---

## Step 1 — Scaffold, Tailwind and the dev proxy

### What was built

| Area                                        | Files                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vite app (React 19 + TS strict)             | `package.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `tsconfig*.json`                          |
| Dev server proxy, `@/` alias, Vitest config | `vite.config.ts`                                                                                           |
| Design tokens (light/dark) and fonts        | `src/styles/theme.css`                                                                                     |
| Theme logic + toggle                        | `src/lib/theme.ts`, `src/lib/useTheme.ts`, `src/components/ThemeToggle.tsx`, inline script in `index.html` |
| Formatting helpers                          | `src/lib/format.ts`, `src/lib/format.test.ts`                                                              |
| Placeholder home page                       | `src/app/HomePage.tsx`                                                                                     |
| Lint/format/test tooling                    | `eslint.config.js`, `.prettierrc.json`, `src/test/setup.ts`, `src/components/ThemeToggle.test.tsx`         |

Scripts: `npm run dev` (http://localhost:5173), `build`, `test`, `test:watch`, `lint`, `format`, `format:check`.

### Concepts, compared with Angular

**Vite vs Angular CLI.**
The Angular CLI is a framework-owned toolchain: `ng new` and `ng serve`, with `angular.json` controlling a builder (esbuild in recent versions) that knows about modules, templates and AOT compilation.
Vite is a framework-agnostic dev server and bundler. React support is just a plugin (`@vitejs/plugin-react`), and so is Tailwind (`@tailwindcss/vite`).
In dev, Vite serves source files as native ES modules and only transforms what the browser requests, so startup is near-instant. `vite build` bundles for production.
You get fewer conventions (no generators, no `ng g component`), so folder layout is a team decision. Ours is in `CLAUDE.md`.

- `angular.json` → `vite.config.ts`
- `proxy.conf.json` → `server.proxy` in `vite.config.ts`
- `tsconfig` `paths` still drive the `@/` alias, but Vite needs `resolve.alias` too, since TS only type-checks and Vite does the resolving.
- `ng test` (Karma/Jest) → `vitest`, which reuses the same Vite config and transforms.

**The dev proxy.** `/api` and `/openapi` are forwarded to the gateway on `localhost:5000`. The browser only ever talks to `localhost:5173`, so every request is same-origin and CORS never comes up. This is the same idea as Angular's `proxy.conf.json`. In production, nginx does the same job (step 8).

**JSX vs templates.**
An Angular component has a separate HTML template with its own syntax: `*ngFor`/`@for`, `*ngIf`/`@if`, `[prop]`, `(event)` and pipes.
In React the "template" is the return value of a function, written in JSX. JSX is JavaScript with HTML-like syntax, so control flow is just JavaScript:

- `@for (q of quotes; track q.symbol)` → `quotes.map(q => <li key={q.symbol}>…</li>)`. `key` plays the role of `track`.
- `@if (x) {…}` → `{x && …}` or a ternary.
- `[class.text-up]="up"` → build the `className` string in JS (see `toneClass` in `HomePage.tsx`).
- `(click)="toggle()"` → `onClick={toggle}`.
- Pipes such as `currency:'INR'` → plain function calls, like `{formatINR(value)}`.
  Because it is all TypeScript, the compiler checks templates with no extra tooling (Angular needs strict template type-checking for that).
  Two JSX gotchas: `class` is spelled `className`, and a component must return a single root (use `<>…</>` fragments).

**Components and props vs `@Input`.**
A React component is a function that takes one `props` object and returns JSX. `function Stat({ label, value, tone }: StatProps)` is the equivalent of a component class with `@Input() label`, `@Input() value` and `@Input() tone` (or `input()` signals).
Props are read-only, like inputs. Instead of `@Output() changed = new EventEmitter()`, a parent passes a callback prop (`onChange={…}`), and the child calls it.
There is no `NgModule` and no `imports: []` on a standalone component. You import the function and use it as a tag.
`HomePage.tsx` defines small private components (`Change`, `Stat`) in the same file. That's normal in React and cheap, because a component is just a function.

**Hooks (first look).**
`useTheme()` is a custom hook. It plays the role a small injectable service would in Angular, but it has no DI container: each component that calls it gets its own state.

- `useState` is the component's local state. Setting it re-renders the component, a bit like updating a signal.
- `useEffect` runs after render. Returning a function from it is the cleanup (≈ `ngOnDestroy`/`DestroyRef`). We use it to subscribe to OS theme changes and unsubscribe on unmount.
  If several components need to share state, we'll lift it into context (step 2).

**Tailwind utility classes vs component SCSS.**
Angular encourages a per-component `.scss` file with view encapsulation. Tailwind instead puts small single-purpose classes in the markup: `rounded-lg border border-border bg-surface px-4 py-3`.

- Scoping comes for free: styles live on the element, so there's no leakage and no need for `::ng-deep`.
- Reuse happens through components, not CSS classes. Instead of `.card` in a stylesheet, you write a `<Stat>` component.
- **Tailwind v4 is CSS-first.** There is no `tailwind.config.js`. Tokens are declared in CSS with `@theme`. We keep the raw colours as CSS variables (`--surface` …) and switch them under `[data-theme='dark']`. `@theme inline` maps them to utilities (`bg-surface`, `text-up`, `border-border`), so each class always reads the current variable.
- `@custom-variant dark` makes `dark:` utilities follow our `data-theme` attribute instead of only the OS setting.
- `prettier-plugin-tailwindcss` sorts class lists into a consistent order.

### Design decisions

- **Theme state.** The explicit choice is saved in `localStorage` (`bulliondesk.theme`); otherwise the app follows `prefers-color-scheme` live. A tiny inline script in `index.html` sets `data-theme` before React loads, which avoids a flash of the wrong theme. _Not chosen:_ a three-way light/dark/system switch, which is more UI than needed for now. Media-query-only dark mode was also rejected because it can't be toggled.
- **Tokens as CSS variables, not Tailwind's `dark:` on every element.** One class (`bg-surface`) works in both themes, so components never mention dark mode.
- **Formatters are plain functions with cached `Intl` instances**, not components or hooks. They're pure, easy to test, and usable anywhere. Missing or non-finite values render as `—` rather than `₹NaN`.
- **Percentages are in percentage points** (`1.25` → `1.25%`). This is an assumption about the API, to re-check in step 2 against the OpenAPI documents.
- **IST is explicit** (`timeZone: 'Asia/Kolkata'`), so times are correct whatever the viewer's or CI machine's time zone. The tests check the rollover at IST midnight.
- **Fonts are self-hosted** via `@fontsource-variable` (Inter for UI, JetBrains Mono with `tabular-nums` for numbers so columns line up). _Not chosen:_ the Google Fonts CDN, which is an extra origin and a privacy concern.
- **ESLint over oxlint.** The current Vite template ships oxlint. CLAUDE.md asks for ESLint, and the react-hooks rules matter while learning.
- **Placeholder data lives only in `HomePage.tsx`** and is labelled as such. It will be deleted when real quotes arrive.

### Interview questions

1. **Why does the Vite proxy remove the need for CORS in development?**
   CORS applies only to cross-origin browser requests. With the proxy, the page and the API share an origin (`localhost:5173`), and Vite forwards requests to `:5000` server-to-server, where browser CORS rules don't apply.

2. **What is the `key` prop and what goes wrong without a stable one?**
   It identifies list items between renders, like `track` in Angular's `@for`. With index keys or missing keys, React can reuse the wrong DOM node or component state when items are inserted, removed or reordered. The symptoms are inputs showing the wrong values and animations or flashes on the wrong rows.

3. **How does Tailwind v4 dark mode work here without `dark:` classes everywhere?**
   Colours are CSS variables redefined under `:root[data-theme='dark']`, and `@theme inline` points utilities like `bg-surface` at those variables. Switching the attribute swaps every colour at once, and components stay theme-agnostic.
