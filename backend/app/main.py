# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import thermostat as thermostat_router

app = FastAPI(title="HeatBeat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(thermostat_router.router)

@app.get("/health")
def health():
    return {"ok": True}
