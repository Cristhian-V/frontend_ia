# F.A.R.O. — Frontend (Next.js)

**Framework de Asistencia, Respuesta y Operaciones**

Interfaz de usuario de F.A.R.O. construida con Next.js 16, React 19 y Tailwind CSS v4. Consume dos backends: Python (RAG, documentos) y Node.js (auth, admin).

## Stack

- **Next.js 16.2.7** (Turbopack, App Router)
- **React 19.2.4**
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **TypeScript 5**
- **react-markdown** + **remark-gfm** — render de respuestas RAG

## Requisitos

- Node.js 22+
- Backend Python corriendo en `:8000`
- Backend Node corriendo en `:4000`

## Instalacion (dev)

```bash
cd frontend
npm install
```

## Configuracion

Crear `.env.local` en `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ADMIN_API_URL=http://localhost:4000
```

> `NEXT_PUBLIC_API_URL` usa `??` (no `||`) — el string vacio es valido para same-origin en prod.

### Produccion (Docker)

El `Dockerfile` recibe build args:
- `NEXT_PUBLIC_API_URL` (default: `/cumbre-ia/api`)
- `NEXT_PUBLIC_ADMIN_API_URL` (default: `/cumbre-ia/api`)

El reverse proxy (NPM) enruta `/cumbre-ia/api/admin/` al backend Node y `/cumbre-ia/api/` al backend Python.

## Comandos

```bash
# Dev
npm run dev
# → http://localhost:3000/cumbre-ia/

# Build produccion
npm run build

# Start produccion
npm start

# TypeScript check
npx tsc --noEmit

# Lint
npm run lint
```

## Estructura

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (AuthProvider + ThemeProvider)
│   │   ├── page.tsx                # Landing → redirect a /login o /dashboard
│   │   ├── login/                  # Pagina de login
│   │   ├── register/               # Pagina de registro
│   │   └── dashboard/
│   │       ├── layout.tsx          # Sidebar con accordion (filtrado por tools + roles)
│   │       ├── chat/               # Chat RAG (simple/tecnica)
│   │       ├── documentos/         # Upload + lista + chunks + progress stepper
│   │       ├── historial/          # Historial de consultas (admin: todos)
│   │       ├── pendientes/         # Referencias pendientes (vincular/desvincular cascade)
│   │       ├── checklist/          # Checklist normativo (progress bars, filtros)
│   │       └── configuraciones/    # Admin: CRUD usuarios + tools + roles
│   ├── components/                 # UI reutilizable
│   │   ├── ErrorBanner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   └── TextField.tsx
│   ├── hooks/
│   │   └── useUploadProgress.ts    # Hook de polling de upload
│   ├── context/
│   │   ├── AuthContext.tsx         # Auth state (login, register, logout)
│   │   └── ThemeContext.tsx        # Dark/light mode
│   ├── lib/
│   │   ├── api.ts                  # API client (API_BASE + ADMIN_API_BASE)
│   │   ├── tools.ts                # TOOL_KEYS, TOOL_LABELS, ROLE_LABELS, etc.
│   │   └── types.ts                # Tipos compartidos: User, Doc, Progress, Chunk
│   └── images/                     # Logos F.A.R.O.
├── public/
│   └── images/                     # Logos (light/dark variants)
├── next.config.ts                  # basePath: "/cumbre-ia", trailingSlash: true
├── Dockerfile
└── package.json
```

## Roles y acceso al sidebar

| Rol | Chat | Documentos | Historial | Pendientes | Checklist | Configuraciones |
|---|---|---|---|---|---|---|
| **consultor** | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| **gestor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Puertos

| Entorno | Puerto |
|---|---|
| Dev | `3000` |
| Prod (Docker) | `3001:3000` |

## Notas Next.js 16 + Turbopack

- `basePath: "/cumbre-ia"` en `next.config.ts` — los assets se sirven en `/_next/` (sin prefijo); el NPM proxy maneja el prefijo via rewrite.
- `middleware.ts` deprecated en Next.js 16 — auth es client-side en `dashboard/layout.tsx`.
- CPU spike al iniciar dev = stale `.next` cache → `Remove-Item -Recurse .next` y reiniciar.
