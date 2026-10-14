# BullionDesk Web

React frontend for BullionDesk, a paper trading platform for gold and silver futures. See `CLAUDE.md` for the stack and rules, and `docs/FRONTEND-LEARNING.md` for the step-by-step learning log.

## Run

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api and /openapi to the gateway on http://localhost:5000
npm test           # unit tests (Vitest)
npm run lint       # ESLint
npm run build      # type-check + production build into dist/
```

Start the backend gateway on port 5000 first, or API calls will return 502 from the dev proxy.
