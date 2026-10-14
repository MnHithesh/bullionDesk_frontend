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

---

## Step 2 — Typed API client and authentication

### What was built

| Area                                                        | Files                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Type generation (`npm run api:types`)                       | `scripts/generate-api-types.mjs` → `src/api/schema/*.ts`                                                                       |
| Placeholder identity types (until the gateway is reachable) | `src/api/schema/identity.ts`                                                                                                   |
| Typed client, 401 → refresh → retry, `unwrap`               | `src/api/client.ts`                                                                                                            |
| ProblemDetails → `ApiError`                                 | `src/api/errors.ts`                                                                                                            |
| Token storage (memory + localStorage)                       | `src/api/tokens.ts`                                                                                                            |
| Auth API calls, context, provider, guards                   | `src/features/auth/{api.ts,AuthContext.ts,AuthProvider.tsx,RouteGuards.tsx}`                                                   |
| Login / register pages, zod schemas                         | `src/features/auth/{LoginPage,RegisterPage,AuthLayout}.tsx`, `schemas.ts`                                                      |
| Server field errors → form fields                           | `src/lib/forms.ts`                                                                                                             |
| Shared UI                                                   | `src/components/{TextField,Button,Alert,Spinner}.tsx`                                                                          |
| Providers, routes, QueryClient                              | `src/app/{Providers.tsx,routes.tsx,queryClient.ts,App.tsx}`                                                                    |
| Tests (MSW)                                                 | `src/api/client.test.ts`, `src/features/auth/{schemas.test.ts,AuthPages.test.tsx}`, `src/test/{server.ts,render.tsx,setup.ts}` |

Routes: `/login` and `/register` (public only), `/` (signed in only). Anything else redirects to `/` for now.

> **Resolved: generated types.** The gateway wasn't reachable at first, so `src/api/schema/identity.ts` started as a hand-written placeholder. It was corrected from the Identity service source: `displayName` was added to registration and the profile, and the schemas were renamed to `AuthTokensResponse` / `UserProfileResponse`. With the stack running in Docker, `npm run api:types` then generated all six `src/api/schema/*.ts` files from the gateway. The generated identity types matched the corrected placeholder, and the code compiled with no changes. Generated files are listed in `.prettierignore`, so regenerating them never creates formatting churn.

### Concepts, compared with Angular

**Context + provider vs an Angular service.**
In Angular, `AuthService` is `@Injectable({ providedIn: 'root' })`, and any component injects it. React has no DI container. The closest equivalent is **context**:

- `createContext()` makes a "slot" (`AuthContext`).
- `<AuthProvider>` fills that slot for everything rendered inside it, like `providers: [...]` on a component or in `app.config.ts`.
- `useAuth()` reads it (`useContext`). This is our `inject(AuthService)`, with a guard that throws if there's no provider above.
  Two differences matter:

1. Context holds a _value_, not a class instance. When the value changes, every consumer re-renders. That's why `AuthProvider` builds the value with `useMemo`: a new object on every render would re-render all consumers needlessly.
2. Not everything belongs in context. The token store is a plain module (a singleton, like a root service), because `authFetch` runs outside React and can't call hooks. React subscribes to it with **`useSyncExternalStore`**, the official way to read a non-React store. It's roughly `toSignal(observable$)`.

**Hooks vs lifecycle hooks.**
There is no `ngOnInit`, `ngOnChanges` or `ngOnDestroy`. A component function runs on every render, and hooks attach behaviour to it:

- `useState` / `useMemo` / `useCallback`: state and cached values that survive re-renders.
- `useEffect(fn, deps)` runs after render whenever `deps` change. Its return value is the cleanup. One effect covers `ngOnInit`, `ngOnChanges` and `ngOnDestroy` for one concern. Example: `AuthProvider` clears the query cache when `hasSession` becomes false.
- `useQuery` (TanStack) replaces "subscribe in `ngOnInit`, store the result in a field, unsubscribe in `ngOnDestroy`". It also caches, dedupes and refetches.
- `useMutation` wraps a write (login and register). It provides `isPending` for the button spinner and `mutateAsync` to await the result.
- Rules of hooks: call them at the top level, never in `if`s or loops. React identifies each hook by call order. The ESLint `react-hooks` plugin enforces this.

**`authFetch` vs `HttpInterceptor`.**
An Angular interceptor sits in the `HttpClient` pipeline (`intercept(req, next)`), and a refresh-on-401 interceptor typically uses `catchError`, `switchMap`, and a `BehaviorSubject` to queue requests during a refresh.
openapi-fetch lets you pass your own `fetch`. `authFetch` is an async function doing the same job:

1. Attach `Authorization: Bearer …`.
2. On 401, `await refreshAccessToken()`, then resend a **clone** of the original request (a body stream can be read only once, so the clone is taken up front).
3. **Single in-flight refresh:** the first 401 creates the refresh promise. Any other 401 arriving meanwhile gets the _same_ promise (`refreshInFlight ??= …`). Promises are multicast by nature, so no `shareReplay` is needed. A request that 401s after the refresh already finished notices the access token changed and just retries.
4. If the refresh is rejected, the tokens are cleared. `AuthProvider` re-renders with no session, and the guards redirect to `/login`. Nothing imperative like `router.navigate` is needed: the UI is a function of state.
   Network errors during refresh don't log you out (the server may just be down); they surface as a normal error.

**`unwrap` and errors.** openapi-fetch returns `{ data, error, response }` and never throws for HTTP errors. TanStack Query wants a function that _throws_ on failure, so `unwrap()` converts a non-2xx response into an `ApiError` built from the ProblemDetails body. It carries `status`, `title`, `detail`, `fieldErrors` and `correlationId`.

**Forms: react-hook-form + zod vs Reactive Forms.**

- `useForm({ resolver: zodResolver(schema) })` ≈ a `FormGroup` with validators. The zod schema is the single source of truth, and `z.infer` gives the TypeScript type of the form values for free.
- `{...register('email')}` ≈ `formControlName="email"`. It spreads `name`, `onChange`, `onBlur` and `ref` onto the input. Inputs stay _uncontrolled_ (the DOM holds the value), so typing doesn't re-render the whole form. That's a performance choice Angular's Reactive Forms make differently.
- `formState.errors.email?.message` ≈ `form.controls.email.errors`.
- `setError('email', …)` puts a server error on a field, like `control.setErrors({ server: … })`. `applyServerErrors` maps ValidationProblemDetails keys (`Email`, `$.email`) onto form fields; whatever doesn't match shows as a form-level alert.
- React 19: `ref` is an ordinary prop, so `TextField` needs no `forwardRef`.

**Routing: React Router vs Angular Router.**

- The `routes` array ≈ `Routes`. `<Outlet />` ≈ `<router-outlet>`.
- **Guards are components.** `RequireAuth` is a layout route that renders `<Outlet />` when signed in, `<Navigate to="/login" state={{ from }} />` when not, and a spinner while loading. That's `canActivate` plus a `UrlTree` redirect, but it can also _render_ the loading and error states.
- `PublicOnly` sends a signed-in user on to `state.from`, so login automatically returns you to the page you first asked for.

### Design decisions

- **Access token in memory, refresh token in localStorage.**
  - The access token is never stored, so it can't be read from storage.
  - The refresh token survives reloads and new tabs; a `storage` event keeps tabs in sync on logout.
  - _Trade-off vs an httpOnly cookie:_ a cookie is invisible to JavaScript, which is strictly better against token theft via XSS. But it needs the backend to set the cookie (with `SameSite`/`Secure`) and to protect the refresh endpoint against CSRF, and our gateway returns tokens in JSON. With localStorage, XSS remains the main risk: any injected script can read the refresh token. Mitigations: React escapes rendered values, we never use `dangerouslySetInnerHTML`, the backend should rotate refresh tokens (each refresh returns a new one, as our mocks assume), and a CSP header can be added in nginx (step 8).
  - _Not chosen:_ sessionStorage, which loses the session on a new tab and gains little security.
- **Session restore on load:** if only a refresh token exists, `authFetch` refreshes _before_ the first call instead of waiting for a guaranteed 401.
- **Logout is local-first:** tokens are cleared immediately, then the backend is told to revoke the refresh token on a best-effort basis.
- **Retries:** TanStack Query's default of three retries is narrowed: no retries for 4xx, which won't fix themselves.
- **Non-field errors appear as an inline `Alert`, not a toast yet.** CLAUDE.md asks for toasts, but the toast system is part of step 7. When it lands, these alerts move over.
- **Register then login:** we don't assume `/register` returns tokens. After a successful register we call `/login` with the same credentials.
- **openapi-typescript and TS 6:** the generator's peer dependency says TS 5. An `overrides` entry in `package.json` lets it use our TS 6, and it was verified to generate correctly.

### Interview questions

1. **Two requests get a 401 at the same moment. How do you avoid two refresh calls?**
   Keep the refresh promise in a module variable. The first caller creates it, later callers `await` the same promise, and it's cleared in `finally`. A request that fails after the refresh has already finished compares the token it sent with the current one and simply retries. Our test fires three concurrent 401s and asserts a single refresh.

2. **Why is `AuthProvider`'s context value wrapped in `useMemo`?**
   Consumers re-render whenever the context value changes by reference. Building a new object on every render would re-render every `useAuth()` consumer each time the provider renders. `useMemo` keeps the same object until its real inputs change.

3. **Where would you store tokens, and why not just put both in localStorage?**
   The access token lives in memory so it's never sitting in storage. The refresh token sits in localStorage so the session survives a reload, at the cost of being readable by XSS. An httpOnly, SameSite cookie for the refresh token is safer when the backend supports it. Either way, keep access tokens short-lived and rotate refresh tokens.
