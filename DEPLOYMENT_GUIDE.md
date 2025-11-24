# 🌐 HeatBeat - Przewodnik wdrażania w internecie

## 🆓 Kompletnie darmowe opcje

### 1. Railway ⭐ **POLECANE**
- **✅ Pros**: Automatyczne deployments z GitHub, support Docker, darmowy tier
- **💰 Koszt**: $0 - 500h/miesiąc (wystarczy na małe projekty)
- **🔧 Setup**: Git push → automatyczne wdrożenie
- **📊 Limity**: 512MB RAM, $5 credit/miesiąc

### 2. Render
- **✅ Pros**: Darmowy tier, Docker support, SSL certificates
- **💰 Koszt**: $0 dla static sites, $7/miesiąc dla backend
- **🔧 Setup**: GitHub integration, automatyczne builds
- **📊 Limity**: 750h/miesiąc dla darmowej wersji

### 3. Fly.io
- **✅ Pros**: Świetny Docker support, globalny CDN
- **💰 Koszt**: $0 - 3 shared-cpu apps darmowo
- **🔧 Setup**: `flyctl deploy` z Dockerfile
- **📊 Limity**: 256MB RAM, 3GB storage

## 💡 Hybrydowe rozwiązania (frontend darmowy + tani backend)

### Frontend: Vercel/Netlify (darmowy)
- **Frontend React**: Deploy na Vercel (darmowy)
- **Backend**: Railway/Render ($5-7/miesiąc)

### Frontend: GitHub Pages + Backend w chmurze
- **Statyczny build**: GitHub Pages (darmowy)
- **API**: Railway/Render (płatny)

## 🏠 Rozwiązania domowe z tunelowaniem

### 1. Cloudflare Tunnel ⭐ **NAJLEPSZE dla domu**
- **✅ Pros**: Całkowicie darmowy, bezpieczny, bez portu forwarding
- **💰 Koszt**: $0
- **🔧 Setup**: 
  ```bash
  # Instalacja cloudflared
  cloudflared tunnel create heatbeat
  cloudflared tunnel route dns heatbeat yourdomain.com
  cloudflared tunnel run heatbeat
  ```

### 2. Ngrok
- **💰 Koszt**: $0 (z limitami), $8/miesiąc (bez limitów)
- **📊 Limity**: 1 tunel jednocześnie w wersji darmowej

### 3. Tailscale Funnel
- **✅ Pros**: Darmowy, bezpieczny, łatwa konfiguracja
- **💰 Koszt**: $0

## 🚀 Moje rekomendacje

### 🏆 Opcja 1: Cloudflare Tunnel (najlepszy stosunek jakość/cena)
```bash
# 1. Zainstaluj cloudflared
# 2. Utwórz tunel
cloudflared tunnel create heatbeat

# 3. Skonfiguruj DNS (darmowa domena .tk/.ml lub własna)
cloudflared tunnel route dns heatbeat heatbeat.yourdomain.com

# 4. Uruchom tunel
cloudflared tunnel --config cloudflare-tunnel.yml run heatbeat
```

### 🏆 Opcja 2: Railway (najprostszy deployment)
```bash
# 1. Połącz z GitHub
# 2. Deploy backend na Railway ($5/miesiąc)
# 3. Frontend na Vercel (darmowy)
```

### 🏆 Opcja 3: Fly.io (darmowy tier)
```bash
# 1. Zainstaluj flyctl
# 2. flyctl auth signup
# 3. flyctl launch (z Dockerfile.production)
```

## 📋 Co trzeba zmienić w kodzie

1. **Environment variables** dla production
2. **CORS origins** na prawdziwe domeny  
3. **Database** - SQLite → PostgreSQL dla cloud deployments
4. **Static file serving** w FastAPI
5. **HTTPS redirect** i security headers

## 🗂️ Pliki konfiguracyjne

### Railway deployment (`deploy/railway.toml`)
```toml
[build]
  builder = "DOCKERFILE"
  dockerfilePath = "Dockerfile.production"

[deploy]
  healthcheckPath = "/healthz"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"

# Environment variables (set in Railway dashboard)
# DATABASE_URL - will be provided by Railway
# JWT_SECRET_KEY - generate random secret
# CORS_ORIGINS - your frontend domain
```

### Production Dockerfile (`Dockerfile.production`)
```dockerfile
# Production Dockerfile for deployment
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend

WORKDIR /app
COPY backend/ ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend to backend static directory
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8000

# Serve both API and frontend from single container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Vercel deployment (`deploy/vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/node",
      "config": {
        "includeFiles": "frontend/dist/**"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-url.railway.app/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

### Cloudflare Tunnel (`deploy/cloudflare-tunnel.yml`)
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  # Route to your local HeatBeat application
  - hostname: heatbeat.yourdomain.com
    service: http://localhost:5173
  
  # Route API calls to backend
  - hostname: api.heatbeat.yourdomain.com  
    service: http://localhost:8000
    
  # Catch-all rule (required)
  - service: http_status:404
```

### Requirements.txt (production)
```txt
fastapi==0.115.4
uvicorn[standard]==0.32.1
sqlmodel==0.0.25
passlib[bcrypt]==1.7.4
pyjwt==2.10.1
python-multipart==0.0.15
```

## 💡 Podsumowanie

**Dla aplikacji IoT HeatBeat polecam Cloudflare Tunnel - darmowy, bezpieczny i nie wymaga zmiany routera!**

### Zalety każdego rozwiązania:

- **Cloudflare Tunnel**: Najlepszy dla aplikacji domowych IoT
- **Railway**: Najłatwiejszy deployment z GitHub  
- **Fly.io**: Dobry darmowy tier dla małych aplikacji
- **Vercel + Railway**: Rozdzielenie frontend/backend

### Następne kroki:

1. Wybierz platformę wdrożeniową
2. Przygotuj pliki konfiguracyjne  
3. Skonfiguruj environment variables
4. Przetestuj deployment
5. Skonfiguruj domenę i SSL