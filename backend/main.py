# backend/main.py
# FastAPI backend dla HeatBeat – MVP sterowania termostatem
# - JWT logowanie
# - Modele: User, Thermostat, ThermostatSetting, Reading, ScheduleEntry
# - Endpoints dla frontu i dla urządzenia (RP2350)
#
# Uruchom lokalnie: uvicorn main:app --reload
# Zmienna środowiskowa DATABASE_URL (domyślnie SQLite) i JWT_SECRET (zmień w produkcji!)

from datetime import datetime, timedelta, time
from typing import Optional, List, Union
import os
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select, delete
from sqlalchemy import text
from passlib.context import CryptContext
import jwt

# ------------------ Konfiguracja ------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./heatbeat.db")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
JWT_ALG = "HS256"
ACCESS_MINUTES = 120

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# >>> ZMIANA: używamy pbkdf2_sha256 zamiast bcrypt
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# >>> ZMIANA: tokenUrl bez wiodącego / (lepsza współpraca ze swaggerem)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ------------------ Modele DB ------------------

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    is_active: bool = True

class Thermostat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = "Salon"
    owner_id: Optional[int] = Field(default=None, index=True)

class ThermostatSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    target_temp_c: float = 21.0
    mode: str = "auto"
    last_source: Optional[str] = "app"  # "app" | "device" - opcjonalne dla kompatybilności
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Reading(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    temperature_c: float
    humidity_pct: Optional[float] = None
    pressure_hpa: Optional[float] = None
    window_open_detected: Optional[bool] = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ScheduleTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    name: str = "Domyślny harmonogram"
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ScheduleEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    template_id: Optional[int] = Field(default=None, foreign_key="scheduletemplate.id")
    weekday: int
    start: time
    end: time
    target_temp_c: float

# ------------------ Schematy (Pydantic) ------------------

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: str
    password: str

class UserMe(BaseModel):
    id: int
    email: str

class SettingsIn(BaseModel):
    target_temp_c: float
    mode: str  # auto|heat|off

class SettingsOut(SettingsIn):
    last_source: str
    updated_at: datetime

class ReadingIn(BaseModel):
    temperature_c: float
    humidity_pct: Optional[float] = None
    pressure_hpa: Optional[float] = None
    window_open_detected: Optional[bool] = False

class TargetTempIn(BaseModel):
    target_temp_c: float
    source: str = "device"  # "device" vs "app"

class DeviceSettings(BaseModel):
    target_temp_c: float
    source: str = "device"  # "device" lub "app"

class DeviceReading(BaseModel):
    temperature_c: float
    humidity_pct: float  
    pressure_hpa: float
    setpoint_c: float

class ReadingOut(BaseModel):
    id: int
    temperature_c: float
    humidity_pct: Optional[float]
    pressure_hpa: Optional[float]
    window_open_detected: Optional[bool]
    created_at: datetime

class ThermostatCreate(BaseModel):
    name: str

class ThermostatOut(BaseModel):
    id: int
    name: str
    owner_id: Optional[int]
    created_at: Optional[datetime] = None

class ThermostatUpdate(BaseModel):
    name: str

class ScheduleIn(BaseModel):
    weekday: int
    start: str  # "HH:MM"
    end: str    # "HH:MM"
    target_temp_c: float
    template_id: Optional[int] = None

class ScheduleOut(BaseModel):
    id: int
    weekday: int
    start: str
    end: str
    target_temp_c: float
    template_id: Optional[int] = None

class ScheduleTemplateIn(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class ScheduleTemplateOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    entries_count: int = 0

class ScheduleBulkIn(BaseModel):
    weekdays: List[int]  # Lista dni tygodnia [0,1,2,3,4] lub [5,6]
    start: str  # "HH:MM"
    end: str    # "HH:MM"
    target_temp_c: float
    template_id: Optional[int] = None

class ScheduleBulkOut(BaseModel):
    created_count: int
    created_entries: List[ScheduleOut]

# ------------------ Inicjalizacja ------------------

def create_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        u = s.exec(select(User).where(User.email == "admin@heatbeat.pl")).first()
        if not u:
            u = User(email="admin@heatbeat.pl", password_hash=pwd_context.hash("admin123"))
            s.add(u)
            s.commit()
            s.refresh(u)
        t = s.exec(select(Thermostat)).first()
        if not t:
            t = Thermostat(name="Salon", owner_id=u.id)
            s.add(t)
            s.commit()
            s.refresh(t)
            s.add(ThermostatSetting(thermostat_id=t.id, target_temp_c=21.0, mode="auto", last_source="app"))
            s.commit()

create_db()

app = FastAPI(title="HeatBeat FastAPI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.55.252:5173",  # External access
        "*"  # Allow all origins for development - remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Pomocnicze ------------------

def create_access_token(data: dict, minutes: int = ACCESS_MINUTES) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=minutes)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Błędny token")
    with Session(engine) as s:
        user = s.get(User, uid)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieaktywny użytkownik")
        return user

def hhmm_to_time(txt: str) -> time:
    hh, mm = txt.split(":")
    return time(hour=int(hh), minute=int(mm))

def time_to_hhmm(t: time) -> str:
    return f"{t.hour:02d}:{t.minute:02d}"

# ------------------ Auth ------------------

@app.post("/auth/register", response_model=UserMe)
def register(data: UserCreate):
    with Session(engine) as s:
        exists = s.exec(select(User).where(User.email == data.email)).first()
        if exists:
            raise HTTPException(400, "E-mail zajęty")
        u = User(email=data.email, password_hash=pwd_context.hash(data.password))
        s.add(u)
        s.commit()
        s.refresh(u)
        t = Thermostat(name="Mój termostat", owner_id=u.id)
        s.add(t); s.commit()
        s.add(ThermostatSetting(thermostat_id=t.id, target_temp_c=21.0, mode="auto", last_source="app")); s.commit()
        return UserMe(id=u.id, email=u.email)

@app.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as s:
        u = s.exec(select(User).where(User.email == form.username)).first()
        if not u or not pwd_context.verify(form.password, u.password_hash):
            raise HTTPException(status_code=400, detail="Błędny login lub hasło")
        token = create_access_token({"sub": str(u.id)})
        return TokenOut(access_token=token)

@app.get("/auth/me", response_model=UserMe)
def me(user: User = Depends(get_current_user)):
    return UserMe(id=user.id, email=user.email)

# ------------------ Termostaty (UI) ------------------

@app.get("/thermostats", response_model=List[dict])
def list_thermostats(user: User = Depends(get_current_user)):
    """Lista termostatów użytkownika - wymaga autoryzacji"""
    with Session(engine) as s:
        rows = s.exec(select(Thermostat).where(Thermostat.owner_id == user.id)).all()  # Tylko termostaty użytkownika
        out = []
        for t in rows:
            sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == t.id)).first()
            out.append({
                "id": t.id,
                "name": t.name,
                "settings": {
                    "target_temp_c": sett.target_temp_c if sett else 21.0,
                    "mode": sett.mode if sett else "auto",
                    "last_source": sett.last_source if sett else "app"
                }
            })
        return out

@app.get("/thermostats/{tid}/settings", response_model=SettingsOut)
def get_settings(tid: int):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t:
            raise HTTPException(404, "Brak termostatu")
        sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid)).first()
        if not sett:
            raise HTTPException(404, "Brak ustawień")
        return SettingsOut(target_temp_c=sett.target_temp_c, mode=sett.mode, last_source=sett.last_source, updated_at=sett.updated_at)

@app.put("/thermostats/{tid}/settings", response_model=SettingsOut)
def update_settings(tid: int, data: SettingsIn, user: User = Depends(get_current_user)):
    if data.mode not in ("auto", "heat", "off"):
        raise HTTPException(400, "Niepoprawny tryb")
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid)).first()
        if not sett:
            sett = ThermostatSetting(thermostat_id=tid, last_source="app")
            s.add(sett)
        sett.target_temp_c = data.target_temp_c
        sett.mode = data.mode
        sett.last_source = "app"  # Ustawione z aplikacji
        sett.updated_at = datetime.utcnow()  # WAŻNE: Aktualizuj timestamp
        s.add(sett)
        s.commit()
        s.refresh(sett)
        return SettingsOut(target_temp_c=sett.target_temp_c, mode=sett.mode, last_source=sett.last_source, updated_at=sett.updated_at)

@app.get("/thermostats/{tid}/readings", response_model=List[ReadingOut])
def get_readings(tid: int, limit: int = 50):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t:
            raise HTTPException(404, "Brak termostatu")
        q = s.exec(select(Reading).where(Reading.thermostat_id == tid).order_by(Reading.created_at.desc()).limit(limit)).all()
        return [
            ReadingOut(
                id=r.id, temperature_c=r.temperature_c, humidity_pct=r.humidity_pct,
                pressure_hpa=r.pressure_hpa, window_open_detected=r.window_open_detected,
                created_at=r.created_at
            )
            for r in q
        ]

# ------------------ CRUD Termostaty ------------------

@app.post("/thermostats", response_model=ThermostatOut)
def create_thermostat(data: ThermostatCreate, user: User = Depends(get_current_user)):
    """Dodaj nowy termostat - wymaga autoryzacji"""
    with Session(engine) as s:
        # Sprawdź czy nazwa już istnieje dla tego użytkownika
        existing = s.exec(select(Thermostat).where(
            Thermostat.name == data.name, 
            Thermostat.owner_id == user.id
        )).first()
        if existing:
            raise HTTPException(400, f"Termostat o nazwie '{data.name}' już istnieje")
            
        # Utwórz nowy termostat
        thermostat = Thermostat(name=data.name, owner_id=user.id)
        s.add(thermostat)
        s.commit()
        s.refresh(thermostat)
        
        # Utwórz domyślne ustawienia
        settings = ThermostatSetting(
            thermostat_id=thermostat.id,
            target_temp_c=21.0,
            mode="auto",
            last_source="app"
        )
        s.add(settings)
        s.commit()
        
        return ThermostatOut(
            id=thermostat.id,
            name=thermostat.name,
            owner_id=thermostat.owner_id,
            created_at=datetime.utcnow()
        )

@app.put("/thermostats/{tid}", response_model=ThermostatOut)
def update_thermostat(tid: int, data: ThermostatUpdate, user: User = Depends(get_current_user)):
    """Aktualizuj termostat - wymaga autoryzacji"""
    with Session(engine) as s:
        thermostat = s.get(Thermostat, tid)
        if not thermostat or thermostat.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
            
        # Sprawdź czy nowa nazwa już istnieje dla tego użytkownika (oprócz aktualnego termostatu)
        existing = s.exec(select(Thermostat).where(
            Thermostat.name == data.name,
            Thermostat.owner_id == user.id,
            Thermostat.id != tid
        )).first()
        if existing:
            raise HTTPException(400, f"Termostat o nazwie '{data.name}' już istnieje")
            
        thermostat.name = data.name
        s.add(thermostat)
        s.commit()
        s.refresh(thermostat)
        
        return ThermostatOut(
            id=thermostat.id,
            name=thermostat.name,
            owner_id=thermostat.owner_id
        )

@app.delete("/thermostats/{tid}")
def delete_thermostat(tid: int, user: User = Depends(get_current_user)):
    """Usuń termostat - wymaga autoryzacji"""
    with Session(engine) as s:
        thermostat = s.get(Thermostat, tid)
        if not thermostat or thermostat.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
            
        # Usuń powiązane dane
        # 1. Usuń odczyty
        s.exec(delete(Reading).where(Reading.thermostat_id == tid))
        
        # 2. Usuń wpisy harmonogramów
        s.exec(delete(ScheduleEntry).where(ScheduleEntry.thermostat_id == tid))
        
        # 3. Usuń szablony harmonogramów
        s.exec(delete(ScheduleTemplate).where(ScheduleTemplate.thermostat_id == tid))
        
        # 4. Usuń ustawienia
        s.exec(delete(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid))
        
        # 5. Usuń sam termostat
        s.delete(thermostat)
        s.commit()
        
        return {"message": f"Termostat '{thermostat.name}' został usunięty"}

# ------------------ Harmonogramy ------------------

@app.get("/thermostats/{tid}/schedule", response_model=List[ScheduleOut])
def list_schedule(tid: int, template_id: Optional[int] = None, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        query = select(ScheduleEntry).where(ScheduleEntry.thermostat_id == tid)
        if template_id is not None:
            query = query.where(ScheduleEntry.template_id == template_id)
        
        rows = s.exec(query.order_by(ScheduleEntry.weekday, ScheduleEntry.start)).all()
        return [ScheduleOut(
            id=e.id, weekday=e.weekday, start=time_to_hhmm(e.start), 
            end=time_to_hhmm(e.end), target_temp_c=e.target_temp_c,
            template_id=e.template_id
        ) for e in rows]

@app.get("/thermostats/{tid}/schedule/templates", response_model=List[ScheduleTemplateOut])
def list_schedule_templates(tid: int, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        templates = s.exec(select(ScheduleTemplate).where(ScheduleTemplate.thermostat_id == tid)).all()
        result = []
        for template in templates:
            entries_count = s.exec(select(ScheduleEntry).where(ScheduleEntry.template_id == template.id)).all()
            result.append(ScheduleTemplateOut(
                id=template.id,
                name=template.name,
                description=template.description,
                is_active=template.is_active,
                created_at=template.created_at,
                entries_count=len(entries_count)
            ))
        return result

@app.post("/thermostats/{tid}/schedule/templates", response_model=ScheduleTemplateOut)
def create_schedule_template(tid: int, data: ScheduleTemplateIn, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        template = ScheduleTemplate(
            thermostat_id=tid,
            name=data.name,
            description=data.description,
            is_active=data.is_active
        )
        s.add(template)
        s.commit()
        s.refresh(template)
        
        return ScheduleTemplateOut(
            id=template.id,
            name=template.name,
            description=template.description,
            is_active=template.is_active,
            created_at=template.created_at,
            entries_count=0
        )

@app.put("/thermostats/{tid}/schedule/templates/{template_id}", response_model=ScheduleTemplateOut)
def update_schedule_template(tid: int, template_id: int, data: ScheduleTemplateIn, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        template = s.get(ScheduleTemplate, template_id)
        if not template or template.thermostat_id != tid:
            raise HTTPException(404, "Brak szablonu")
        
        template.name = data.name
        template.description = data.description
        template.is_active = data.is_active
        s.add(template)
        s.commit()
        s.refresh(template)
        
        entries_count = len(s.exec(select(ScheduleEntry).where(ScheduleEntry.template_id == template.id)).all())
        return ScheduleTemplateOut(
            id=template.id,
            name=template.name,
            description=template.description,
            is_active=template.is_active,
            created_at=template.created_at,
            entries_count=entries_count
        )

@app.delete("/thermostats/{tid}/schedule/templates/{template_id}")
def delete_schedule_template(tid: int, template_id: int, delete_entries: bool = False, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        template = s.get(ScheduleTemplate, template_id)
        if not template or template.thermostat_id != tid:
            raise HTTPException(404, "Brak szablonu")
        
        # Sprawdź czy istnieją wpisy powiązane z tym szablonem
        entries = s.exec(select(ScheduleEntry).where(ScheduleEntry.template_id == template_id)).all()
        if entries and not delete_entries:
            raise HTTPException(400, f"Szablon zawiera {len(entries)} wpisów. Użyj delete_entries=true aby je usunąć.")
        
        # Usuń wpisy jeśli delete_entries=true
        if delete_entries:
            for entry in entries:
                s.delete(entry)
        
        s.delete(template)
        s.commit()
        return {"ok": True, "deleted_entries": len(entries) if delete_entries else 0}

@app.post("/thermostats/{tid}/schedule", response_model=ScheduleOut)
def add_schedule(tid: int, data: ScheduleIn, user: User = Depends(get_current_user)):
    if not (0 <= data.weekday <= 6):
        raise HTTPException(400, "weekday 0..6")
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        # Sprawdź czy template_id istnieje (jeśli podane)
        if data.template_id is not None:
            template = s.get(ScheduleTemplate, data.template_id)
            if not template or template.thermostat_id != tid:
                raise HTTPException(404, "Brak szablonu")
        
        e = ScheduleEntry(
            thermostat_id=tid,
            template_id=data.template_id,
            weekday=data.weekday,
            start=hhmm_to_time(data.start),
            end=hhmm_to_time(data.end),
            target_temp_c=data.target_temp_c
        )
        s.add(e); s.commit(); s.refresh(e)
        return ScheduleOut(
            id=e.id, weekday=e.weekday, start=data.start, end=data.end, 
            target_temp_c=e.target_temp_c, template_id=e.template_id
        )

@app.post("/thermostats/{tid}/schedule/bulk", response_model=ScheduleBulkOut)
def add_schedule_bulk(tid: int, data: ScheduleBulkIn, user: User = Depends(get_current_user)):
    # Walidacja dni tygodnia
    for weekday in data.weekdays:
        if not (0 <= weekday <= 6):
            raise HTTPException(400, f"Nieprawidłowy dzień tygodnia: {weekday} (oczekiwane 0-6)")
    
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        # Sprawdź czy template_id istnieje (jeśli podane)
        if data.template_id is not None:
            template = s.get(ScheduleTemplate, data.template_id)
            if not template or template.thermostat_id != tid:
                raise HTTPException(404, "Brak szablonu")
        
        created_entries = []
        for weekday in data.weekdays:
            e = ScheduleEntry(
                thermostat_id=tid,
                template_id=data.template_id,
                weekday=weekday,
                start=hhmm_to_time(data.start),
                end=hhmm_to_time(data.end),
                target_temp_c=data.target_temp_c
            )
            s.add(e)
            s.commit()
            s.refresh(e)
            created_entries.append(ScheduleOut(
                id=e.id, weekday=e.weekday, start=data.start, end=data.end,
                target_temp_c=e.target_temp_c, template_id=e.template_id
            ))
        
        return ScheduleBulkOut(
            created_count=len(created_entries),
            created_entries=created_entries
        )

@app.delete("/thermostats/{tid}/schedule/{sid}")
def del_schedule(tid: int, sid: int, user: User = Depends(get_current_user)):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        e = s.get(ScheduleEntry, sid)
        if not e or e.thermostat_id != tid:
            raise HTTPException(404, "Brak wpisu")
        s.delete(e); s.commit()
        return {"ok": True}

@app.put("/thermostats/{tid}/schedule/{sid}", response_model=ScheduleOut)
def update_schedule(tid: int, sid: int, data: ScheduleIn, user: User = Depends(get_current_user)):
    if not (0 <= data.weekday <= 6):
        raise HTTPException(400, "weekday 0..6")
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t or t.owner_id != user.id:
            raise HTTPException(404, "Brak termostatu")
        
        e = s.get(ScheduleEntry, sid)
        if not e or e.thermostat_id != tid:
            raise HTTPException(404, "Brak wpisu")
        
        # Sprawdź czy template_id istnieje (jeśli podane)
        if data.template_id is not None:
            template = s.get(ScheduleTemplate, data.template_id)
            if not template or template.thermostat_id != tid:
                raise HTTPException(404, "Brak szablonu")
        
        e.template_id = data.template_id
        e.weekday = data.weekday
        e.start = hhmm_to_time(data.start)
        e.end = hhmm_to_time(data.end)
        e.target_temp_c = data.target_temp_c
        s.add(e)
        s.commit()
        s.refresh(e)
        
        return ScheduleOut(
            id=e.id, weekday=e.weekday, start=data.start, end=data.end,
            target_temp_c=e.target_temp_c, template_id=e.template_id
        )

# ------------------ Endpointy dla URZĄDZENIA (RP2350) ------------------

@app.post("/device/{tid}/reading")
def device_push_reading(tid: int, data: Union[ReadingIn, DeviceReading]):
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t:
            raise HTTPException(404, "Nieznany termostat")
        
        # Obsługa DeviceReading z setpoint_c
        if hasattr(data, 'setpoint_c'):
            # Aktualizujemy również ustawienia termostatu jeśli otrzymujemy setpoint_c
            sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid)).first()
            if sett and sett.target_temp_c != data.setpoint_c:
                # Jeśli setpoint_c różni się od bazy, aktualizujemy (prawdopodobnie zmiana z termostatu)
                sett.target_temp_c = data.setpoint_c
                sett.last_source = "device"
                sett.updated_at = datetime.utcnow()
                s.add(sett)
        
        r = Reading(
            thermostat_id=tid,
            temperature_c=data.temperature_c,
            humidity_pct=data.humidity_pct,
            pressure_hpa=data.pressure_hpa,
            window_open_detected=getattr(data, 'window_open_detected', False)
        )
        s.add(r); s.commit(); s.refresh(r)
        return {"ok": True, "id": r.id, "at": r.created_at.isoformat()}

@app.get("/device/{tid}/settings")
def device_pull_settings(tid: int):
    with Session(engine) as s:
        sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid)).first()
        if not sett:
            raise HTTPException(404, "Brak ustawień")
        # Zapewnienie wartości domyślnej dla last_source
        last_source = sett.last_source or "app"
        return {"target_temp_c": sett.target_temp_c, "mode": sett.mode, "last_source": last_source, "updated_at": sett.updated_at.isoformat()}

@app.put("/device/{device_id}/settings")
def device_update_settings(device_id: int, settings: DeviceSettings):
    """Endpoint PUT dla termostatu do aktualizacji temperatury zadanej"""
    if not (10.0 <= settings.target_temp_c <= 30.0):
        raise HTTPException(status_code=400, detail="Temperatura poza zakresem 10-30°C")
    
    with Session(engine) as s:
        t = s.get(Thermostat, device_id)
        if not t:
            raise HTTPException(404, "Nieznany termostat")
        
        sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == device_id)).first()
        if not sett:
            sett = ThermostatSetting(thermostat_id=device_id)
            s.add(sett)
        
        sett.target_temp_c = settings.target_temp_c
        sett.last_source = settings.source
        sett.updated_at = datetime.utcnow()
        s.add(sett)
        s.commit()
        s.refresh(sett)
        
        return {"status": "ok"}

@app.post("/device/{tid}/target-temp")
def device_set_target_temp(tid: int, data: TargetTempIn):
    """Endpoint dla urządzenia do ustawiania temperatury zadanej (np. gdy użytkownik zmieni na termostacie)"""
    with Session(engine) as s:
        t = s.get(Thermostat, tid)
        if not t:
            raise HTTPException(404, "Nieznany termostat")
        
        sett = s.exec(select(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid)).first()
        if not sett:
            sett = ThermostatSetting(thermostat_id=tid)
            s.add(sett)
        
        sett.target_temp_c = data.target_temp_c
        sett.last_source = data.source  # "device" lub "app"
        sett.updated_at = datetime.utcnow()
        s.add(sett)
        s.commit()
        s.refresh(sett)
        
        return {
            "ok": True, 
            "target_temp_c": sett.target_temp_c, 
            "source": sett.last_source,
            "updated_at": sett.updated_at.isoformat()
        }

# ------------------ Debug/Admin ------------------
@app.put("/admin/thermostats/{tid}/owner/{user_id}")
def assign_thermostat_owner(tid: int, user_id: int):
    """DEBUG: Przypisz termostat do użytkownika - tylko do rozwoju!"""
    with Session(engine) as s:
        thermostat = s.get(Thermostat, tid)
        if not thermostat:
            raise HTTPException(404, "Termostat nie istnieje")
        
        user = s.get(User, user_id)
        if not user:
            raise HTTPException(404, "Użytkownik nie istnieje")
            
        thermostat.owner_id = user_id
        s.add(thermostat)
        s.commit()
        
        return {"message": f"Termostat {tid} przypisany do użytkownika {user.email}"}

@app.put("/admin/users/{user_id}/email")
def update_user_email(user_id: int, new_email: str = Body(..., embed=True)):
    """DEBUG: Zmień email użytkownika - tylko do rozwoju!"""
    with Session(engine) as s:
        user = s.get(User, user_id)
        if not user:
            raise HTTPException(404, "Użytkownik nie istnieje")
        
        # Sprawdź czy nowy email już istnieje
        existing = s.exec(select(User).where(User.email == new_email)).first()
        if existing and existing.id != user_id:
            raise HTTPException(400, f"Email {new_email} jest już zajęty")
            
        old_email = user.email
        user.email = new_email
        s.add(user)
        s.commit()
        
        return {"message": f"Email użytkownika zmieniony z {old_email} na {new_email}"}

@app.get("/admin/users")
def list_all_users():
    """DEBUG: Lista wszystkich użytkowników - tylko do rozwoju!"""
    with Session(engine) as s:
        users = s.exec(select(User)).all()
        return [{"id": u.id, "email": u.email, "is_active": u.is_active} for u in users]

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int):
    """DEBUG: Usuń użytkownika wraz z jego termostatami - tylko do rozwoju!"""
    with Session(engine) as s:
        user = s.get(User, user_id)
        if not user:
            raise HTTPException(404, "Użytkownik nie istnieje")
        
        if user.email == "admin@example.com":
            raise HTTPException(400, "Nie można usunąć głównego admina")
        
        # Znajdź wszystkie termostaty użytkownika
        user_thermostats = s.exec(select(Thermostat).where(Thermostat.owner_id == user_id)).all()
        
        deleted_thermostats = []
        for thermostat in user_thermostats:
            tid = thermostat.id
            # Usuń powiązane dane termostatu
            s.exec(delete(Reading).where(Reading.thermostat_id == tid))
            s.exec(delete(ScheduleEntry).where(ScheduleEntry.thermostat_id == tid))
            s.exec(delete(ScheduleTemplate).where(ScheduleTemplate.thermostat_id == tid))
            s.exec(delete(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid))
            s.delete(thermostat)
            deleted_thermostats.append(f"{tid}: {thermostat.name}")
        
        # Usuń użytkownika
        user_email = user.email
        s.delete(user)
        s.commit()
        
        return {
            "message": f"Użytkownik {user_email} usunięty",
            "deleted_thermostats": deleted_thermostats
        }

@app.post("/admin/cleanup")
def cleanup_database():
    """DEBUG: Usuń wszystkich użytkowników oprócz admin@example.com - tylko do rozwoju!"""
    with Session(engine) as s:
        # Znajdź wszystkich użytkowników oprócz admina
        users_to_delete = s.exec(select(User).where(User.email != "admin@example.com")).all()
        
        deleted_users = []
        deleted_thermostats = []
        
        for user in users_to_delete:
            user_id = user.id
            user_email = user.email
            
            # Znajdź wszystkie termostaty użytkownika
            user_thermostats = s.exec(select(Thermostat).where(Thermostat.owner_id == user_id)).all()
            
            for thermostat in user_thermostats:
                tid = thermostat.id
                # Usuń powiązane dane termostatu
                s.exec(delete(Reading).where(Reading.thermostat_id == tid))
                s.exec(delete(ScheduleEntry).where(ScheduleEntry.thermostat_id == tid))
                s.exec(delete(ScheduleTemplate).where(ScheduleTemplate.thermostat_id == tid))
                s.exec(delete(ThermostatSetting).where(ThermostatSetting.thermostat_id == tid))
                s.delete(thermostat)
                deleted_thermostats.append(f"{tid}: {thermostat.name}")
            
            # Usuń użytkownika
            s.delete(user)
            deleted_users.append(f"{user_id}: {user_email}")
        
        s.commit()
        
        return {
            "message": f"Usunięto {len(deleted_users)} użytkowników",
            "deleted_users": deleted_users,
            "deleted_thermostats": deleted_thermostats
        }

# ------------------ Admin - Tworzenie termostatu z określonym ID ------------------
@app.post("/admin/thermostats/create-with-id", response_model=ThermostatOut)
def create_thermostat_with_id(
    thermostat_id: int, 
    name: str, 
    user_id: int,
    user: User = Depends(get_current_user)
):
    """Stwórz termostat z określonym ID - tylko dla administratora"""
    # Sprawdź czy użytkownik to admin
    if user.email != "admin@example.com":
        raise HTTPException(403, "Tylko administrator może tworzyć termostaty z określonym ID")
        
    with Session(engine) as s:
        # Sprawdź czy ID jest już zajęte
        existing = s.get(Thermostat, thermostat_id)
        if existing:
            raise HTTPException(400, f"Termostat z ID {thermostat_id} już istnieje")
        
        # Sprawdź czy użytkownik istnieje
        target_user = s.get(User, user_id)
        if not target_user:
            raise HTTPException(404, f"Użytkownik z ID {user_id} nie istnieje")
        
        # Sprawdź czy nazwa już istnieje dla tego użytkownika
        existing_name = s.exec(select(Thermostat).where(
            Thermostat.name == name,
            Thermostat.owner_id == user_id
        )).first()
        if existing_name:
            raise HTTPException(400, f"Termostat o nazwie '{name}' już istnieje dla tego użytkownika")
        
        # Tworzymy nowy termostat normalnie
        thermostat = Thermostat(name=name, owner_id=user_id)
        s.add(thermostat)
        s.flush()  # Żeby uzyskać wygenerowane ID
        
        # Teraz ręcznie zmieniamy ID
        # Usuń z sesji aby można było zmienić ID
        s.expunge(thermostat)
        
        # Użyj surowego SQL do wstawienia z określonym ID
        s.execute(text(
            "DELETE FROM thermostat WHERE id = :old_id"
        ), {"old_id": thermostat.id})
        
        s.execute(text(
            "INSERT INTO thermostat (id, name, owner_id) VALUES (:id, :name, :owner_id)"
        ), {"id": thermostat_id, "name": name, "owner_id": user_id})
        
        # Tworzenie domyślnych ustawień
        settings = ThermostatSetting(
            thermostat_id=thermostat_id,
            target_temp_c=21.0,
            mode="auto",
            last_source="app"
        )
        s.add(settings)
        
        s.commit()
        
        # Zwróć utworzony termostat
        thermostat = s.get(Thermostat, thermostat_id)
        return ThermostatOut(
            id=thermostat.id,
            name=thermostat.name,
            owner_id=thermostat.owner_id,
            created_at=datetime.utcnow()
        )

# ------------------ Dostępne ID termostatów ------------------
@app.get("/available-ids")
def get_available_ids(user: User = Depends(get_current_user)):
    """Zwraca dostępne ID termostatów (1-100) które nie są zajęte"""
    with Session(engine) as s:
        # Pobierz wszystkie zajęte ID
        used_ids = s.exec(select(Thermostat.id)).all()
        used_ids_set = set(used_ids)
        
        # Wygeneruj listę dostępnych ID (1-100)
        available_ids = [i for i in range(1, 101) if i not in used_ids_set]
        
        return {
            "available_ids": available_ids[:20],  # Pokaż pierwsze 20
            "used_ids": sorted(used_ids),
            "total_available": len(available_ids)
        }

# ------------------ Zdrowie ------------------
@app.get("/healthz")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}
