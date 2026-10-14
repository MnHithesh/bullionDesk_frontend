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

---

## Step 3 — App shell and market watch

### What was built

| Area                                                          | Files                                                                                                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed-in layout: top bar, side nav, mobile drawer, user menu | `src/app/{AppShell.tsx,UserMenu.tsx,nav.ts,ComingSoonPage.tsx}`, `src/app/routes.tsx`                                                           |
| Top bar data: available funds, margin status pill             | `src/features/wallet/{api.ts,AvailableFunds.tsx}`, `src/features/risk/{api.ts,MarginStatusPill.tsx}`                                            |
| Market data hooks and response mapping                        | `src/features/markets/api.ts`, `src/api/convert.ts`, `src/api/client.ts` (new service clients)                                                  |
| Markets page: expiry tabs, groups by underlying, quote rows   | `src/features/markets/{MarketsPage,ExpiryTabs,QuoteRow,PriceChange,FlashPrice}.tsx`                                                             |
| Instrument detail: spec, live price, candlestick chart        | `src/features/markets/{InstrumentDetailPage,CandleChart}.tsx`, `candles.ts`                                                                     |
| Loading, empty and error states                               | `src/components/{Skeleton,QueryStates}.tsx`                                                                                                     |
| Price flash animation (motion-safe)                           | `src/styles/theme.css`                                                                                                                          |
| Tests                                                         | `src/features/markets/{QuoteRow,FlashPrice,MarketsPage}.test.tsx`, `candles.test.ts`; default MSW handlers in `src/test/{handlers,fixtures}.ts` |

Routes: `/` now redirects to `/markets`; `/markets/:symbol` is the detail page (lazy-loaded); Orders, Positions, Wallet and Risk are "coming soon" placeholders so the navigation works.

### Concepts, compared with Angular

**TanStack Query polling vs RxJS polling.**
In Angular you'd write something like `timer(0, 1000).pipe(switchMap(() => http.get(...)), shareReplay(1))`, subscribe with the `async` pipe, and add `takeUntil(destroy$)` or `takeUntilDestroyed()` to stop it. Pausing on a hidden tab means merging in `fromEvent(document, 'visibilitychange')` yourself.
With TanStack Query it's options on the query:

- `refetchInterval: 1000` is the timer plus `switchMap`. A slow response is never overlapped by the next one.
- `refetchIntervalInBackground: false` (the default) pauses while the tab is hidden, and `refetchOnWindowFocus` catches up as soon as it's visible again.
- **Sharing is by key, not by `shareReplay`.** The market table and the detail page both call `useQuery` with `['quotes']`. One poll runs, and both read the same cache. The detail page uses `select` to pick out one symbol, much like a `map()` that only re-renders when its result changes.
- **Unsubscribing is automatic.** When the last component using `['quotes']` unmounts, polling stops. There's no `takeUntil` to forget.
- On an error the last good data stays in `data`. The page shows a banner over the old prices instead of blanking the table.

**`useEffect` cleanup vs `ngOnDestroy`.**
`CandleChart` wraps lightweight-charts, an imperative canvas library, the way you'd wrap a jQuery plugin in a directive.

- `useEffect(() => { const chart = createChart(el); …; return () => chart.remove() }, [])` is `ngAfterViewInit` (the `ref` is like `@ViewChild`) plus `ngOnDestroy`, written side by side for one concern.
- Each effect has its own cleanup: the chart effect removes the chart and disconnects the `MutationObserver` that recolours it on a theme change. `UserMenu` adds `document` listeners only while open, and the cleanup removes them on close _or_ unmount.
- Effects with dependencies (`[candles]`, `[price, timestamp, interval]`) work like `ngOnChanges` for those inputs: React runs the previous cleanup (if any), then the effect again.
- In development, StrictMode mounts, unmounts and remounts every component once, specifically to catch effects without a proper cleanup. A chart created without `chart.remove()` would show up twice.
- **Not everything needs an effect.** `FlashPrice` compares the new price with the previous one _during render_ (stored in state), and `AppShell` closes the drawer when the path changes the same way. An effect would paint the stale state first, then fix it.

**Keys and list rendering.**
`*ngFor` with `trackBy` becomes `array.map(item => <Row key={item.symbol} … />)`.

- The `key` tells React which row is which between renders. With `key={symbol}`, a poll that updates prices updates the rows in place. Each `FlashPrice` keeps its "previous price" state, which is what makes the flash work. With index keys, filtering by expiry would hand one contract's state to another.
- Keys only need to be unique among siblings: `underlying` for each `<tbody>`, `symbol` inside it.
- **Keys can also force a remount on purpose.** `FlashPrice` puts a counter in the `key` of its `<span>`. Each price change gives it a new key, so React creates a fresh element, and the CSS animation starts again even if the previous one hadn't finished.

**Other bits.**

- **Layout routes:** `AppShell` is a route with no path whose children render in its `<Outlet />`, like a shell component with `<router-outlet>`. It sits inside `RequireAuth`, so the guard runs first.
- **Lazy routes:** `lazy: () => import(...)` is `loadComponent` in Angular. The chart library ships in a separate 168 kB chunk, loaded only when a detail page opens.
- **URL state:** the selected expiry is `?expiry=2026-12-05`, read with `useSearchParams` (≈ `ActivatedRoute.queryParamMap`). A reload or a shared link keeps the tab.
- **Native `<dialog>`** for the mobile drawer: `showModal()` gives focus trapping, Escape and an inert background, which you'd normally get from the CDK's `Overlay`/`FocusTrap`.
- **Tailwind `motion-safe:`** applies the flash only when the user hasn't asked for reduced motion (`prefers-reduced-motion`).

### Design decisions

- **Map API responses into feature types.** The generated OpenAPI types say decimals are `number | string` and enums are `number`, but the API sends plain numbers and enum _names_ (`"FUT"`, `"Normal"`). `toInstrument`, `toQuote`, `toMargin` and the others convert once in `api.ts`, so components see `number | null` and string unions. _Backend follow-up:_ the services' OpenAPI documents should describe enums as strings (`JsonStringEnumConverter` needs to be registered where the OpenAPI generator sees it, i.e. `ConfigureHttpJsonOptions`). Regenerating would then make the enum part of the mapping unnecessary.
- **One quotes poll for the whole app** (`GET /api/quotes` without `symbols`) rather than one per page or row. There are six contracts, so one small response a second is cheaper than many.
- **Live last candle on the client.** History comes from `/api/candles` once per interval. Each quote then updates the last candle (or opens the next one) using `applyQuote`, aligned to IST boundaries like the backend's bars (hourly candles start at :30 UTC). This only shapes what is drawn, and the backend's bars replace it on the next fetch. _Not chosen:_ refetching candles every second, which would be heavier and still lag.
- **Wallet and margin poll every 5 s** for the top bar. Live push (SignalR) is a phase 3 backend item.
- **The drawer renders its contents only while open,** so a closed drawer doesn't duplicate the nav links and funds in the DOM (or in tests).
- **Detail page instead of a side panel.** Opening a row navigates to `/markets/:symbol`. It works the same on a phone, it can be bookmarked, and Back works.
- **Table on phones:** at 360 px the Change, High and Low columns are hidden (Change % stays), and the cell padding and text shrink so the table fits without scrolling sideways.
- **Bundle size:** the main chunk is right at Vite's 500 kB warning. Splitting out the auth pages (zod, react-hook-form) is a cheap fix if it grows; it's left for the polish step.

### Interview questions

1. **How do you poll an endpoint every second in React without leaks or overlapping requests?**
   Use TanStack Query's `refetchInterval`. It waits for a request to finish before scheduling the next one, pauses while the tab is hidden, shares one poll between every component using the same key, and stops when the last one unmounts. A hand-written version needs `setInterval` in a `useEffect` with `clearInterval` in the cleanup, an in-flight guard, an `AbortController`, and a `visibilitychange` listener.

2. **What does the function returned from `useEffect` do, and when does it run?**
   It's the cleanup. React calls it before running the effect again (when a dependency changes) and when the component unmounts. That's where you remove listeners, disconnect observers, cancel timers, or call `chart.remove()`. In development StrictMode runs mount, cleanup, mount on purpose, to expose effects that don't clean up.

3. **Why shouldn't you use the array index as a `key` in a list that can be filtered or reordered?**
   React matches elements between renders by key. With index keys, after a filter or sort, row 0's state, DOM and effects get reused for a different item. In our table that would flash the wrong price or keep stale input values. A stable id like the contract symbol keeps each row's state with its own data.

---

## Step 4 — Order ticket and order book

### What was built

| Area                                                                                                              | Files                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order API: types, response mapping, query keys, hooks (preview, place, poll, list, modify, cancel)                | `src/features/orders/api.ts`, `src/api/client.ts` (`orderApi`)                                                                                                         |
| Order ticket on the instrument page: side, lots stepper, Market/Limit, limit price; preview; confirm; live status | `src/features/orders/{OrderTicket,OrderPreviewPanel,OrderTracker,OrderTimeline,OrderStatusBadge}.tsx`, `ticketSchema.ts`                                               |
| Order book with filters, pagination, modify and cancel                                                            | `src/features/orders/{OrdersPage,OrderRow,ModifyOrderDialog}.tsx`, `modifySchema.ts`                                                                                   |
| Shared pieces                                                                                                     | `src/components/Dialog.tsx`, `Button.tsx` (buy/sell variants), `src/lib/{useDebouncedValue,ticks,istDays}.ts`                                                          |
| Tests                                                                                                             | `src/features/orders/{OrderTicket,OrdersPage}.test.tsx`, `ticketSchema.test.ts`, `src/lib/{ticks,istDays}.test.ts`; helpers `src/test/{session,fixtures,render}.ts(x)` |

### Concepts, compared with Angular

**Controlled forms vs reactive forms.**
In Angular, Reactive Forms keep the value in a `FormControl` and the template binds to it; `valueChanges` is an Observable you pipe.
React offers two styles:

- **Controlled:** React state is the source of truth and the input shows it: `value={x} onChange={e => setX(e.target.value)}`. Every keystroke re-renders. Our `Segmented` (Buy/Sell, Market/Limit) is a controlled component: it shows `value` and calls `onChange`, nothing more. It plugs into react-hook-form through `<Controller>`, the bridge for custom inputs (like implementing `ControlValueAccessor`).
- **Uncontrolled (react-hook-form's default):** the DOM holds the value and `register()` reads it through a ref. Typing doesn't re-render the form. The lots and price inputs work this way. `setValueAs` turns the input's text into a number (`''` → `NaN` for lots, `null` for price) before zod validates it.
- `useWatch({ control })` is the equivalent of `form.valueChanges`. It re-renders the ticket when a value changes, which is what drives the preview.
- **The zod schema is built per contract** (`orderTicketSchema(tickSize)`), because the tick check depends on the spec. It's like a validator factory `tickValidator(tick)`, and `useMemo` keeps the same schema instance until the tick size changes.

**Debouncing.**
RxJS: `valueChanges.pipe(debounceTime(300), distinctUntilChanged(), switchMap(v => preview(v)))`.
Here, three pieces do the same job:

1. `useDebouncedValue(value, 300)` (`debounceTime`): every change restarts a `setTimeout`, and the effect's cleanup `clearTimeout`s the previous one.
2. The debounced value is a **JSON string** of the valid input. Strings compare by value, so an unchanged ticket doesn't restart the timer (`distinctUntilChanged`). An object would be "new" on every render.
3. TanStack Query does the `switchMap` part: the query key contains the input, so a new input means a new query, and an outdated response can never overwrite a newer one. Identical inputs are cached, so going back to 1 lot is instant.

`placeholderData: keepPreviousData` keeps the previous preview visible (dimmed) while the next one loads, so the panel doesn't flicker on every keystroke.

**Optimistic vs server-confirmed updates.**

- _Optimistic:_ update the UI immediately (`onMutate` → `setQueryData`) and roll back if the server says no. It's great for a "like" button.
- _Server-confirmed_ (what we do for orders): the UI only shows what the backend reported. Placing an order shows **Pending**, the real first status. Cancelling shows **"Cancelling…"**, which is a request in progress, not a pretend "Cancelled": `DELETE` returns `202 Accepted`, and the order may still fill before the cancel lands. The row then polls `GET /api/orders/{id}` until a final status arrives, and only then shows the outcome.
- We do use `setQueryData` with the server's _response_ (the 201/202 body) to seed the detail cache, so the tracker renders at once without an extra request. That's a cache shortcut, not a guess.
- For money, a wrong optimistic state ("Filled!" then "Rejected") is worse than a short wait.

**Query invalidation.**
Angular has no built-in cache. You usually re-call the service or push into a `BehaviorSubject` after a change.
TanStack Query marks cached data stale and refetches whatever is on screen:

- `invalidateQueries({ queryKey: ['orders'] })` matches every key _starting with_ `['orders']` (lists with any filters, details, previews), so query keys are designed as a hierarchy (`orderKeys`).
- `invalidateAfterOrderChange` also invalidates `['wallet']` and `['margin']`. A fill or cancel changes blocked margin, and the top bar then updates on its own.
- It's triggered by **results, not requests**: after a modify succeeds, and when a tracked order reaches a final status (an effect watching `final`). Invalidating right after `POST /api/orders` would mostly refetch the same Pending state.

**Polling until done.** `refetchInterval` can be a function of the query: `status is final ? false : 1000`. Polling stops by itself when the order settles, the equivalent of `takeWhile(o => !isFinal(o.status), true)`. The order list polls every 3 s only while a row on the page is still live.

### Design decisions

- **Preview only for a valid ticket.** An invalid form shows "Fix the highlighted fields" and sends nothing. Server-side field errors (such as the maximum lots, a backend rule we don't copy) are mapped onto the same fields from the preview's 400 response.
- **Confirm step inside the ticket**, not a modal: it shows the exact request plus margin and charges. Nothing is sent until "Place buy/sell order", and the button is disabled while the request is in flight, so a double click can't place twice.
- **Insufficient funds**: the backend rejects asynchronously (`Rejected`, reason "Margin not available: Insufficient funds"). The ticket turns that into a sentence with both numbers (required margin from the order, available funds from the wallet). The order book shows the needed margin under the badge.
- **Modify sends only what changed** (`null` = keep). The dialog explains up front that a change must fit inside the margin already blocked. A 422 shows the backend's numbers plus the way out: cancel and place a new order.
- **Dates are IST days.** The filter turns `2026-10-14` into `[2026-10-13T18:30Z, 2026-10-14T18:30Z)`, so "To = today" includes today's orders.
- **Filters and page in the URL**, and changing a filter resets to page 1. `keepPreviousData` dims the table instead of flashing a skeleton between pages.
- **Native `<dialog>`** for confirm and modify. jsdom doesn't implement `showModal()` yet, so `src/test/setup.ts` adds a two-line stand-in.
- **Accessible row actions:** buttons read "Cancel" visually but are announced as "Cancel order SILVER26DECFUT" (`aria-label`), so a screen-reader user knows which row they're acting on.

### Interview questions

1. **How would you call a preview API as the user types, without flooding the server or showing stale results?**
   Validate first, and debounce the _valid_ input (300 ms). Make the request input part of the query key, so each distinct input is its own cached query and an older response can't replace a newer one. Keep the previous result visible while the next one loads. In RxJS: `debounceTime` + `distinctUntilChanged` + `switchMap`.

2. **When would you use an optimistic update, and why not for cancelling an order?**
   When the action almost always succeeds and a rollback is harmless (likes, renames, reordering). An order cancel is accepted asynchronously (202) and can lose a race with a fill. Showing "Cancelled" and then "Filled" would be misleading about money, so we show a pending state and poll for the confirmed result.

3. **What does `invalidateQueries` do, and how do you decide what to invalidate?**
   It marks matching cached queries stale and refetches those currently in use. The key acts as a prefix, so `['orders']` covers every order list and detail. Invalidate whatever the server-side change affects. A cancelled order frees margin, so wallet and margin are invalidated too. Do it after the server confirms the change, not when the request is sent.

---

## Step 5 — Positions, P&L and trades

### What was built

| Area                                                                                                 | Files                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Portfolio API: positions, position detail, trades, trade charges, P&L summary, daily P&L, square-off | `src/features/portfolio/api.ts`, `src/api/client.ts` (`portfolioApi`)                                          |
| Positions page (2 s poll), close one / close all with confirmation, detail drawer                    | `src/features/portfolio/{PositionsPage,PositionDrawer}.tsx`                                                    |
| Trades page with filters and paging; contract-note dialog                                            | `src/features/portfolio/{TradesPage,ContractNote}.tsx`                                                         |
| P&L page: summary cards and daily bar chart                                                          | `src/features/portfolio/{PnlPage,DailyPnlChart,PnlAmount}.tsx`, `loss-hatch` utility in `src/styles/theme.css` |
| Shared: compound drawer, filter fields, pagination, IST day helpers                                  | `src/components/{Drawer,FilterFields,Pagination}.tsx`, `src/lib/istDays.ts` (`istToday`, `addDays`)            |
| Navigation                                                                                           | `/trades` and `/pnl` routes and nav items                                                                      |
| Tests                                                                                                | `src/features/portfolio/{PnlAmount,PositionsPage,PnlPage}.test.tsx`, `src/lib/istDays.test.ts`                 |

### Concepts, compared with Angular

**Derived state vs stored state.**
Store the minimum, and compute everything else during render.

- _Stored:_ what only the user or the server can tell us. Examples are the positions (server state, in the query cache), the selected position (`?position=` in the URL), which closes the user asked for (`closeRequested`), and which trade's contract note is open.
- _Derived:_ everything computable from those. "Is this row closing?" is `closeRequested ∩ open positions`, recomputed on every render. When the 2 s poll stops returning a symbol, the row is gone and so is its "Closing…" state, with no cleanup code. Storing an `isClosing` flag would need an effect to clear it, and the two could disagree for a frame or forever.
- The page title count, "Close all N positions", the chart's 30 day slots and the bar heights are all derived.
- In Angular you'd reach for a `computed()` signal or a `combineLatest` stream for the same thing. In React a plain `const` in the component body _is_ the computed value, because the function runs again on every change.
- **Money stays stored, server-side.** The header's "Total unrealised" comes from `GET /api/pnl`, not from summing the rows. Summing in the browser would be money maths in the UI (against the project rules), and it could disagree with the backend's rounding.

**`useMemo` vs pure pipes.**
An Angular pure pipe (`{{ days | fillCalendar:from:to }}`) runs again only when its inputs change by reference. `useMemo(fn, deps)` is the same idea in code: `DailyPnlChart` builds 30 calendar slots from the API days and caches them until `days`, `from` or `to` change. Hovering bars re-renders the component without rebuilding the slots.
Differences to know:

- `useMemo` is an optimisation, not a guarantee: React may drop the cache, and the result must be the same either way, exactly like a pure pipe must be pure.
- Most derivations don't need it. Filtering 20 rows is cheaper than the bookkeeping, so `PositionsPage` computes its sets inline. Use `useMemo` for real work, or to keep an object's _identity_ stable for a dependency array (like the zod schema in step 4).
- A pipe is reusable in any template. The React equivalent of that reuse is just a function (`addDays`, `formatSignedINR`) or a custom hook.

**Compound components.**
`<Drawer>`, `<Drawer.Header>` and `<Drawer.Body>` are separate components that work as one. The parent owns the behaviour (native `<dialog>`, `showModal`, Escape, backdrop click) and shares what the parts need (`onClose`, the title id for `aria-labelledby`) through a private context.

- Callers arrange the parts freely, with no `showCloseButton`, `title` or `footer` props piling up on one component.
- Angular gets similar results with content projection (`<ng-content select="drawer-header">`), plus a parent component injected into children (`inject(DrawerComponent)`). The context plays the role of that injection.
- Using `Drawer.Header` outside a `Drawer` throws a clear error, the same guard `useAuth()` uses.
- The parts are attached as static properties (`Drawer.Header = DrawerHeader`), which keeps React Fast Refresh happy (`Object.assign(...)` exports trip the lint rule).

### Design decisions

- **Square-off is server-confirmed.** The dialog says what will happen (sell/buy N lots at market). After `POST /api/orders/square-off` the row shows "Closing…" until the 2 s poll no longer returns it. A failure (such as 404 "No open position") stays in the dialog. On success, positions, P&L, trades, orders, wallet and margin are all invalidated.
- **Daily P&L takes IST days.** `GET /api/pnl/daily` binds `From`/`To` as `DateOnly` (inclusive IST trading days), while `/api/trades` and `/api/orders` take instants. The first version sent instants and the real backend answered 400. MSW mocks accept anything, so only the browser check against the running backend caught it. A test now pins the date format.
- **Chart encoding:** one zero baseline; profit bars rise in green and loss bars fall in red with a diagonal hatch. The red/green pair alone fails colour-blind separation in dark mode (checked with the dataviz palette validator), so position, the sign in every label, the hatch, and a "Show as table" view carry the meaning. Every day has a focusable slot with a tooltip, and empty days are kept so the time axis is honest. The tooltip opens towards the middle so it never spills off the card.
- **Contract note:** a table with turnover, each charge and a ruled total, in the backend's own figures. No rates are shown or computed in the UI (rates live only in `charges.json` on the backend).
- **Position detail as a drawer** with the symbol in the URL (`?position=`), so a reload or a shared link reopens it.
- **Tables on phones:** the screen-reader-only labels (`sr-only`, which is `position: absolute`) were escaping each table's scroll box and widening the whole page at 360 px. `relative` on the wrapper keeps them inside. This also fixed the Orders page from step 4.

### Interview questions

1. **What's the difference between derived and stored state, and why does it matter?**
   Stored state is the source of truth (user input, server data, URL). Derived state is computed from it on each render. Storing something derivable creates two sources of truth that can drift and need effects to sync. Derive it instead, and memoise only if the computation is expensive.

2. **When should you use `useMemo`, and how is it like an Angular pure pipe?**
   Both recompute only when their inputs change by reference, and both must be pure. Use `useMemo` for expensive computations, or to keep an object or array identity stable for a dependency list or a memoised child. Don't wrap cheap expressions; the bookkeeping costs more than it saves.

3. **What is a compound component, and how do the parts communicate?**
   A set of components designed to be used together (`<Drawer>`, `<Drawer.Header>`, `<Drawer.Body>`), like `<select>`/`<option>`. The parent holds the state and behaviour and passes it to the parts through a context that isn't exported. Callers get a flexible layout without a large props API. It's the counterpart of Angular content projection plus injecting the parent component.

---

## Step 6 — Wallet and risk

### What was built

| Area                                                                                                                 | Files                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Wallet page: balance cards, ledger (type/date filters, paging, icon + signed amount), reset with the 422 explanation | `src/features/wallet/{WalletPage,LedgerIcon}.tsx`, `api.ts` (`useLedger`, `useResetWallet`)                |
| Risk page: 2 s margin poll, gauge, status, figures, per-position maintenance and P&L, margin-call history            | `src/features/risk/{RiskPage,MarginGauge,RiskStatusBadge}.tsx`, `api.ts` (full `Margin`, `useMarginCalls`) |
| Gauge thresholds and status wording                                                                                  | `src/features/risk/gauge.ts`                                                                               |
| App-wide banner for MarginCall / SquareOff                                                                           | `src/features/risk/MarginBanner.tsx`, placed in `src/app/AppShell.tsx`                                     |
| Routes                                                                                                               | `/wallet` and `/risk` are real pages now; the "coming soon" placeholder is gone                            |
| Tests                                                                                                                | `src/features/risk/{gauge.test.ts,MarginBanner.test.tsx}`, `src/features/wallet/WalletPage.test.tsx`       |

### Concepts, compared with Angular

**Global UI state vs server state.**
In Angular, app-wide state usually lives in a root service (`BehaviorSubject` or signals), or in NgRx when it grows. React's usual answers are context, or a small store such as Zustand (`create(set => ({ ... }))`, read with a hook and a selector).
Ask first _whose_ state it is:

- **Server state** is a copy of data the backend owns: margin status, wallet, positions. It goes stale, needs refetching, can fail, and is shared by many components. TanStack Query is the store for it. The margin banner needs no context or Zustand: `MarginBanner`, the top-bar pill and the Risk page all call `useMargin()` with the same key, so they read one cache entry and always agree. Putting a copy in a global store would create a second source of truth to keep in sync.
- **Polling is shared too.** The shell polls margin every 5 s. The Risk page asks for the same key every 2 s, and TanStack polls at the _shortest_ interval any mounted observer requests. While the Risk page is open the banner and pill update every 2 s as well, and they drop back to 5 s when it closes.
- **Client (UI) state** exists only in the browser: theme, whether a drawer is open, a dismissed banner, a draft form. Most of it is local (`useState`). Truly global UI state that many distant components change is where context or Zustand earns its place: context for values that rarely change (theme, the signed-in user), Zustand for frequently changing ones, because context re-renders every consumer on each change while Zustand re-renders only components whose selected slice changed.
- So far the app has two global things, and both fit this split: auth (context, rarely changes) and the theme (a `data-theme` attribute plus `localStorage`). Neither needed a store library.

**Accessibility of status colours.**
Green, amber and red are a common colour-blindness confusion set, and colour means nothing to a screen reader. Every status here is carried by words first:

- **Text label + icon + colour:** "✓ Normal", "! Margin call", "✕ Square-off". The pill says "Margin OK". Ledger entries show their type name and a CASH/MARGIN tag, not just a coloured amount.
- **Signs on numbers:** amounts are `+₹5,730.00` / `-₹517.81`, so direction survives without colour. Margin block/release amounts are _not_ coloured as profit or loss, because they aren't.
- **The gauge** is `role="meter"` with an `aria-valuetext` reading out equity, maintenance and square-off level. Its markers are labelled in text below the bar, and the square-off band is hatched as well as tinted.
- **The banner** is `role="alert"`, so it's announced when it appears. It explains what happened and what to do, and links to the Risk page. The Risk page's status badge sits in an `aria-live="polite"` region, so a change from Normal to Margin call is read out.
- **Contrast:** the tones come from the theme tokens, which were chosen for readable text on both light and dark surfaces. Tinted backgrounds (`bg-warning/15`) keep the text colour at full strength.

### Design decisions

- **The backend decides the status; the gauge only draws.** `gaugeLayout` puts equity in a zone by the reported levels (≥ maintenance safe, below it a margin call, at or below square-off level square-off). The badge and banner use the backend's `status`, which has hysteresis: it stays in a margin call until equity recovers with some room. During that recovery the gauge can show green while the badge still says "Margin call". That's deliberate, and the words are the authority.
- **Gauge scale** runs to the larger of equity and maintenance plus 25% headroom, so neither marker sits on the edge. Negative equity pins to the left edge. With no positions there is no requirement, so the gauge is replaced by a sentence.
- **Reset:** the dialog warns up front when margin is blocked, and a 422 shows the backend's reason, why it's refused, and links to Positions and open orders. A successful reset invalidates wallet (including the ledger), margin and P&L.
- **Banner placement:** below the sticky header rather than inside it, so the side nav's sticky offset still matches the header height. It shows on every page and drops its "View risk" link on the Risk page itself.
- **Icons are SVG, not emoji:** emoji depend on the system's fonts (the headless browser showed empty boxes for 🔒).

### Interview questions

1. **When would you use context or Zustand instead of TanStack Query, and vice versa?**
   TanStack Query is for server state: anything the backend owns, which needs caching, refetching and error handling. Context or Zustand is for client state that many components share. Use context for rarely changing values (theme, current user), and Zustand when updates are frequent and you want selector-based re-renders. Don't copy server data into a client store; you'd have to keep two sources of truth in sync.

2. **Two components poll the same query at different intervals. What happens?**
   They share one cache entry, keyed by the query key, and TanStack Query refetches at the shortest interval among the mounted observers. When the faster component unmounts, the polling slows back down. Every reader sees the same data at the same time.

3. **How do you make a red/amber/green status accessible?**
   Never rely on colour alone. Add a text label and an icon, use signs on numbers, and use patterns or position in charts. Expose the value to assistive tech (`role="meter"` with `aria-valuetext`, `role="alert"` for urgent banners, `aria-live` for changing statuses). Check text contrast in both themes, and test with a colour-blindness simulator.
