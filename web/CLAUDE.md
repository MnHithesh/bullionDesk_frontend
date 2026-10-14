# BullionDesk Web

React frontend for BullionDesk, a paper trading platform for gold and silver futures. Simulated market, virtual money.
The backend is already built (see ../README.md and ../docs/API.md). All calls go through the gateway at /api.

## Stack

- Vite + React 19 + TypeScript (strict), function components and hooks only
- Tailwind CSS v4 with design tokens in src/styles/theme.css (light + dark)
- TanStack Query for all server state; React Router for routes; react-hook-form + zod for forms
- Typed API client generated from the gateway's OpenAPI documents (openapi-typescript + openapi-fetch)
- lightweight-charts for candles
- Vitest + Testing Library + MSW for tests; Playwright for end-to-end against docker compose

## Rules

- Never call fetch directly in components: use the typed client in src/api and hooks in src/features/*/api.ts.
- Money and prices come from the API as numbers; format with the helpers in src/lib/format.ts (₹, en-IN grouping, 2 decimals). Never do money maths in the UI beyond display; the backend is the source of truth.
- Show ProblemDetails errors from the API: field errors next to form fields, others as a toast.
- Every list has loading, empty and error states.
- Accessible by default: labels on inputs, keyboard focus visible, colour is never the only signal (up/down also has an arrow or sign).
- Responsive down to 360px.
- Folder layout: src/app (shell, routes, providers), src/features/<feature> (components, hooks, api), src/components (shared UI), src/lib (helpers).
- Keep changes to the step you are asked for. Do not build ahead.

## Learning log

The owner knows Angular well and is learning React. After every step, append to docs/FRONTEND-LEARNING.md:

- what was built and which files
- each React / Tailwind / TanStack concept used, compared with the Angular equivalent (component, service, RxJS, DI, routing, forms)
- design decisions and alternatives not chosen
- 3 interview questions about this step, with short answers
