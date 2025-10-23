# backend/app/routers/thermostat.py
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..schemas.thermostat import TelemetryIn, SetpointIn, StateOut, CommandsOut

router = APIRouter(prefix="/api/v1", tags=["thermostat"])

# --- Auth (MVP): podłącz tu swoją walidację JWT, jeśli już masz w projekcie ---
bearer = HTTPBearer(auto_error=False)

def require_user_token(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    # TODO: zweryfikuj JWT i zwróć user_id/claims, jeśli chcesz
    return {"user_id": "demo"}

def require_device(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing device token")
    # TODO: w produkcji rozdziel tokeny user/device lub sprawdzaj "scope": "device"
    return {"device": "ok"}

# --- Pamięć robocza (in-memory; łatwo wymienić na DB) ---
LAST_TELEMETRY: Dict[str, TelemetryIn] = {}
TARGETS: Dict[str, float] = {}
COMMANDS: Dict[str, List[dict]] = defaultdict(list)
WS_CLIENTS: Dict[str, List[WebSocket]] = defaultdict(list)

@router.post("/telemetry")
async def push_telemetry(t: TelemetryIn, _auth=Depends(require_device)):
    LAST_TELEMETRY[t.device_id] = t
    # powiadom subskrybentów WS (frontend)
    for ws in list(WS_CLIENTS[t.device_id]):
        try:
            await ws.send_json({"type": "telemetry", "data": t.model_dump()})
        except Exception:
            try:
                WS_CLIENTS[t.device_id].remove(ws)
            except ValueError:
                pass
    return {"ok": True}

@router.get("/thermostats/{device_id}/state", response_model=StateOut)
def get_state(device_id: str, _auth=Depends(require_user_token)):
    return StateOut(
        device_id=device_id,
        last_telemetry=LAST_TELEMETRY.get(device_id),
        target_c=TARGETS.get(device_id),
    )

@router.post("/thermostats/{device_id}/setpoint")
async def set_setpoint(device_id: str, body: SetpointIn, _auth=Depends(require_user_token)):
    TARGETS[device_id] = body.target_c
    cmd = {
        "id": f"cmd_{datetime.utcnow().timestamp()}",
        "ts": datetime.utcnow().isoformat(),
        "type": "set_target",
        "target_c": body.target_c,
    }
    COMMANDS[device_id].append(cmd)
    # powiadom WS
    for ws in list(WS_CLIENTS[device_id]):
        try:
            await ws.send_json({"type": "setpoint", "target_c": body.target_c})
        except Exception:
            try:
                WS_CLIENTS[device_id].remove(ws)
            except ValueError:
                pass
    return {"ok": True}

@router.get("/thermostats/{device_id}/commands", response_model=CommandsOut)
def pull_commands(device_id: str, since: Optional[float] = None, _auth=Depends(require_device)):
    cmds = COMMANDS.get(device_id, [])
    if since:
        cmds = [c for c in cmds if float(c["id"].split("_")[1]) > since]
    return {"commands": cmds}

@router.websocket("/ws/thermostats/{device_id}")
async def ws(device_id: str, websocket: WebSocket):
    await websocket.accept()
    WS_CLIENTS[device_id].append(websocket)
    try:
        while True:
            # keepalive — ignorujemy payload
            await websocket.receive_text()
    except WebSocketDisconnect:
        try:
            WS_CLIENTS[device_id].remove(websocket)
        except ValueError:
            pass
