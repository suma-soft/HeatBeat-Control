# Dane do rozdziału 5.2 - Implementacja backendu (FastAPI)

## 1. ARCHITEKTURA BACKENDU

### Technologie i biblioteki
```python
# requirements.txt
fastapi==0.115.4          # Framework API z automatyczną dokumentacją
uvicorn[standard]==0.32.1 # ASGI server production-ready
sqlmodel==0.0.25          # ORM łączący SQLAlchemy + Pydantic
passlib[bcrypt]==1.7.4    # Hashing haseł (PBKDF2-SHA256)
PyJWT==2.10.1             # JSON Web Tokens dla autoryzacji
python-multipart==0.0.15  # Obsługa form-data (logowanie)
```

### Struktura projektu
```
backend/
├── main.py              # Główny plik aplikacji (1340 linii)
├── requirements.txt     # Dependencje Python
├── Dockerfile          # Konteneryzacja
└── heatbeat.db         # SQLite database (auto-generated)
```

## 2. KONFIGURACJA I INICJALIZACJA

### Zmienne środowiskowe
```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./heatbeat.db")
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")  
JWT_ALG = "HS256"
ACCESS_MINUTES = 120  # Czas życia tokena JWT
```

### Konfiguracja SQLAlchemy Engine
```python
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
```

### Inicjalizacja FastAPI App
```python
app = FastAPI(title="HeatBeat FastAPI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Frontend dev
        "http://127.0.0.1:5173", 
        "http://192.168.55.252:5173", # External access
        "*"  # Development - remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 3. MODELE DANYCH (SQLModel)

### Model User
```python
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    is_active: bool = True
```

### Model Thermostat (z kompatybilnością wsteczną)
```python
class Thermostat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = "Salon"
    owner_id: Optional[int] = Field(default=None, index=True)  # Legacy
```

### Model UserThermostat (Many-to-Many)
```python
class UserThermostat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    thermostat_id: int = Field(foreign_key="thermostat.id", index=True)
    is_owner: bool = Field(default=False)
    added_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        unique_together = ["user_id", "thermostat_id"]
```

## 4. SYSTEM AUTORYZACJI JWT

### Generowanie tokenów
```python
def create_access_token(data: dict, minutes: int = ACCESS_MINUTES) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=minutes)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)
```

### Middleware autoryzacji
```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
        
        with Session(engine) as s:
            user = s.get(User, int(user_id))
            if not user:
                raise HTTPException(401, "User not found")
            return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
```

### Hashing haseł
```python
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Hashowanie
password_hash = pwd_context.hash(password)

# Weryfikacja
is_valid = pwd_context.verify(password, stored_hash)
```

## 5. ENDPOINTY API

### Autoryzacja (auth)
```python
@app.post("/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends()):
    # Walidacja email/hasło
    # Zwraca JWT token

@app.post("/auth/register", response_model=UserMe)  
def register(data: UserCreate):
    # Tworzenie nowego użytkownika
    
@app.get("/auth/me", response_model=UserMe)
def me(user: User = Depends(get_current_user)):
    # Informacje o zalogowanym użytkowniku
```

### Termostaty (frontend API)
```python
@app.get("/thermostats", response_model=List[dict])
def list_thermostats(user: User = Depends(get_current_user)):
    # Lista termostatów użytkownika (własne + udostępnione)
    # Łączy dane z Thermostat + UserThermostat + ThermostatSetting

@app.put("/thermostats/{tid}/settings", response_model=SettingsOut)
def update_thermostat_settings(tid: int, data: SettingsIn, user: User = Depends(get_current_user)):
    # Zmiana ustawień termostatu przez aplikację
    # Ustawia last_source = "app"
    
@app.get("/thermostats/{tid}/readings", response_model=List[ReadingOut])
def get_readings(tid: int, limit: int = 50, user: User = Depends(get_current_user)):
    # Historia odczytów z sensora (sortowane chronologicznie)
```

### Urządzenia IoT (device API)
```python
@app.post("/device/{tid}/reading")
def device_push_reading(tid: int, data: Union[ReadingIn, DeviceReading]):
    # Przyjęcie odczytu z urządzenia RP2350
    # Inteligentna synchronizacja temperatury z 5-minutowym oknem
    
@app.get("/device/{tid}/settings") 
def device_pull_settings(tid: int):
    # Pobranie aktualnych ustawień przez urządzenie

@app.put("/device/{device_id}/settings")
def device_update_settings(device_id: int, settings: DeviceSettings):
    # Aktualizacja ustawień przez urządzenie (zmiana lokalna)
    # Ustawia last_source = "device"
```

## 6. INTELIGENTNA SYNCHRONIZACJA IoT

### Problem konfliktów
System rozwiązuje konflikty gdy użytkownik zmienia temperaturę w aplikacji, a urządzenie wysyła swoją lokalną wartość.

### Algorytm (5-minutowe okno ochronne)
```python
@app.post("/device/{tid}/reading") 
def device_push_reading(tid: int, data: DeviceReading):
    if hasattr(data, 'setpoint_c'):  # Urządzenie wysłało temperaturę zadaną
        sett = get_thermostat_setting(tid)
        
        if sett.target_temp_c != data.setpoint_c:
            # Sprawdź czy była świeża zmiana z aplikacji (5 minut)
            time_diff = datetime.utcnow() - sett.updated_at
            recent_app_change = (
                sett.last_source == "app" and 
                time_diff.total_seconds() < 300  # 5 minut
            )
            
            if not recent_app_change:
                # Można nadpisać - brak świeżej zmiany z aplikacji
                sett.target_temp_c = data.setpoint_c
                sett.last_source = "device"  
                sett.updated_at = datetime.utcnow()
            else:
                # Blokada - priorytet dla aplikacji w oknie 5 minut
                pass
```

### Pole `last_source` (tracking źródła zmian)
- `"app"` - zmiana z aplikacji mobilnej/webowej
- `"device"` - zmiana lokalna na urządzeniu (pokrętło, przyciski)

## 7. SYSTEM HARMONOGRAMÓW

### Modele harmonogramów
```python
class ScheduleTemplate(SQLModel, table=True):
    # Szablony harmonogramów (np. "Weekend", "Dni robocze")
    
class ScheduleEntry(SQLModel, table=True):  
    # Pojedyncze wpisy harmonogramu
    weekday: int      # 0-6 (poniedziałek-niedziela)
    start: time       # Godzina rozpoczęcia
    end: time         # Godzina zakończenia  
    target_temp_c: float
    template_id: Optional[int]  # Opcjonalne powiązanie z szablonem
```

### API harmonogramów
```python
@app.get("/thermostats/{tid}/schedule", response_model=List[ScheduleOut])
@app.post("/thermostats/{tid}/schedule", response_model=ScheduleOut)  
@app.post("/thermostats/{tid}/schedule/bulk", response_model=ScheduleBulkOut)
@app.delete("/thermostats/{tid}/schedule/{sid}")

# Zarządzanie szablonami
@app.get("/thermostats/{tid}/schedule/templates")
@app.post("/thermostats/{tid}/schedule/templates") 
@app.put("/thermostats/{tid}/schedule/templates/{template_id}")
@app.delete("/thermostats/{tid}/schedule/templates/{template_id}")
```

## 8. PANEL ADMINISTRACYJNY

### Endpointy admin
```python
@app.get("/admin/users")                           # Lista użytkowników
@app.get("/admin/thermostats")                     # Lista wszystkich termostatów
@app.post("/admin/thermostats/{tid}/share/{uid}")  # Udostępnienie termostatu
@app.delete("/admin/thermostats/{tid}/unshare/{uid}") # Cofnięcie udostępnienia
@app.get("/admin/thermostats/{tid}/users")         # Lista użytkowników termostatu
```

### Logika udostępniania
```python
def share_thermostat(thermostat_id: int, user_id: int):
    # Sprawdź czy relacja już istnieje
    existing = session.exec(
        select(UserThermostat)
        .where(UserThermostat.user_id == user_id)
        .where(UserThermostat.thermostat_id == thermostat_id)
    ).first()
    
    if not existing:
        # Utwórz nową relację (nie-właściciel)
        rel = UserThermostat(
            user_id=user_id, 
            thermostat_id=thermostat_id,
            is_owner=False
        )
        session.add(rel)
```

## 9. WALIDACJA I OBSŁUGA BŁĘDÓW

### Walidacja Pydantic
```python
class SettingsIn(BaseModel):
    target_temp_c: float = Field(ge=-40, le=85)  # Zakres temperatury
    mode: str = Field(regex="^(auto|heat|off)$") # Tylko dozwolone tryby

class ScheduleIn(BaseModel): 
    weekday: int = Field(ge=0, le=6)             # Dni tygodnia
    start: str = Field(regex="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # HH:MM
    target_temp_c: float = Field(ge=-40, le=85)
```

### Obsługa błędów HTTP
```python
@app.exception_handler(404)
def not_found_handler(request, exc):
    return JSONResponse({"detail": "Resource not found"}, status_code=404)

# W endpointach:
if not thermostat:
    raise HTTPException(404, "Termostat nie został znaleziony")

if not user.is_active:
    raise HTTPException(403, "Konto nieaktywne")
```

## 10. BAZA DANYCH I INICJALIZACJA

### Automatyczne tworzenie tabel
```python
def create_db():
    SQLModel.metadata.create_all(engine)  # Tworzy wszystkie tabele
    
    with Session(engine) as s:
        # Sprawdź czy istnieje admin
        admin = s.exec(select(User).where(User.email == "admin@example.com")).first()
        if not admin:
            # Utwórz domyślnego admina
            admin = User(
                email="admin@example.com", 
                password_hash=pwd_context.hash("admin123")
            )
            s.add(admin); s.commit(); s.refresh(admin)
            
            # Utwórz domyślny termostat  
            thermostat = Thermostat(name="Salon", owner_id=admin.id)
            s.add(thermostat); s.commit(); s.refresh(thermostat)
            
            # Utwórz domyślne ustawienia
            setting = ThermostatSetting(
                thermostat_id=thermostat.id,
                target_temp_c=21.0,
                mode="auto", 
                last_source="app"
            )
            s.add(setting); s.commit()

# Wywołanie przy starcie aplikacji
create_db()
```

## 11. DOKUMENTACJA AUTOMATYCZNA

### Swagger UI i ReDoc
FastAPI automatycznie generuje dokumentację:
- **Swagger UI**: `http://localhost:8000/docs` 
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### Konfiguracja metadanych
```python
app = FastAPI(
    title="HeatBeat Control API",
    description="REST API for IoT thermostat management",
    version="0.1.0",
    contact={
        "name": "HeatBeat Team", 
        "email": "admin@heatbeat.local"
    }
)
```

## 12. DEPLOYMENT I KONTENERYZACJA

### Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
```

### Docker Compose
```yaml
backend:
  build: ./backend
  environment:
    - DATABASE_URL=sqlite:///./heatbeat.db
    - JWT_SECRET=production_secret_key
  ports:
    - "8000:8000"
  volumes:
    - backend_data:/app
```

### Production considerations
- Zmiana `JWT_SECRET` na bezpieczny klucz
- Użycie PostgreSQL zamiast SQLite
- Usunięcie `allow_origins=["*"]` z CORS
- Konfiguracja reverse proxy (nginx)
- HTTPS/TLS certificates
- Monitoring i logi (Grafana, Prometheus)

## 13. TESTING I QUALITY

### Struktura testów (planned)
```bash
backend/
├── tests/
│   ├── test_auth.py          # Testy autoryzacji
│   ├── test_thermostats.py   # Testy API termostatów
│   ├── test_devices.py       # Testy komunikacji IoT
│   └── test_admin.py         # Testy panelu admin
```

### Przykład testu jednostkowego
```python
def test_create_thermostat():
    client = TestClient(app)
    
    # Logowanie
    login_response = client.post("/auth/login", data={
        "username": "admin@example.com", 
        "password": "admin123"
    })
    token = login_response.json()["access_token"]
    
    # Tworzenie termostatu
    response = client.post("/thermostats", 
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Test Termostat"}
    )
    
    assert response.status_code == 200
    assert response.json()["name"] == "Test Termostat"
```

## 14. METRYKI I WYDAJNOŚĆ

### Database performance
- **Connection pooling**: SQLAlchemy domyślnie
- **Query optimization**: Indeksy na foreign keys
- **Pagination**: Limit 50 odczytów na żądanie

### API response times (target)
- **Authentication**: < 100ms
- **Thermostat list**: < 200ms  
- **Settings update**: < 150ms
- **IoT reading**: < 50ms (critical path)

### Concurrent connections
- **Uvicorn**: Supports async I/O
- **SQLite**: Concurrent reads, sequential writes
- **JWT**: Stateless authentication (scalable)