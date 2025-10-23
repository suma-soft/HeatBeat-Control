# backend/app/schemas/thermostat.py
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

class TelemetryIn(BaseModel):
    device_id: str
    temperature_c: float
    humidity_pct: float
    pressure_hpa: float
    battery_v: Optional[float] = None
    rssi_dbm: Optional[int] = None
    ts: datetime = Field(default_factory=datetime.utcnow)

class SetpointIn(BaseModel):
    target_c: float

class Command(BaseModel):
    id: str
    ts: str
    type: Literal["set_target"]
    target_c: float

class CommandsOut(BaseModel):
    commands: List[Command]

class StateOut(BaseModel):
    device_id: str
    last_telemetry: Optional[TelemetryIn]
    target_c: Optional[float]
