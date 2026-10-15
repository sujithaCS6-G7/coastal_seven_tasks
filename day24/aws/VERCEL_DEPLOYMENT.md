# Vercel Frontend Production Deployment Guide

## 1. Overview
The NexoraAI Single Page Application (React 18 + Vite + TailwindCSS + TanStack Query) is deployed to Vercel for worldwide edge CDN caching, zero cold-starts, and instant git-based previews.

## 2. Deployment via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Authenticate with Vercel account
vercel login

# Link and deploy project to production
vercel --prod --yes
```

## 3. Environment Variables Configuration
Configure the following in **Vercel Dashboard $\to$ Settings $\to$ Environment Variables**:
| Variable Name | Production Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://api.nexora.shop` | AWS EC2 / Nginx HTTPS Backend URL |
| `VITE_WS_URL` | `wss://api.nexora.shop` | Secure WebSocket Gateway URL |
| `VITE_APP_NAME` | `NexoraAI Production Store` | Application Brand Header |
| `VITE_ENVIRONMENT` | `production` | Environment flag |

## 4. Routing & Rewrites (`vercel.json`)
- Clean URLs enabled.
- Automatic SPA client-side fallback via `rewrites` ensuring `/semantic-search`, `/ai-assistant`, and `/products/:id` resolve to `index.html`.
- Strict OWASP headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) applied at edge.
