# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import thermostat as thermostat_router

app = FastAPI(title="HeatBeat API")

# CORS (MVP: szeroko otwarte; doprecyzuj origin na prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twoje inne routery (jeśli są) tutaj...
app.include_router(thermostat_router.router)

@app.get("/health")
def health():
    return {"ok": True}
