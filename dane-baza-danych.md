# Dane do rozdziału 4.4 - Projekt bazy danych

## 1. ARCHITEKTURA BAZY DANYCH

### Typ bazy danych
- **SGBD**: SQLite (development), możliwość migracji na PostgreSQL/MySQL
- **ORM**: SQLModel (FastAPI + SQLAlchemy + Pydantic)
- **Konfiguracja**: `DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./heatbeat.db")`
- **Engine**: SQLAlchemy z parametrem `check_same_thread=False` dla SQLite

## 2. SCHEMAT BAZY DANYCH

### Tabela: user
```sql
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX ix_user_email ON user (email);
```

**Model SQLModel:**
```python
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    is_active: bool = True
```

### Tabela: thermostat
```sql
CREATE TABLE thermostat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR DEFAULT 'Salon',
    owner_id INTEGER
);
CREATE INDEX ix_thermostat_owner_id ON thermostat (owner_id);
```

**Model SQLModel:**
```python
class Thermostat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = "Salon"
    owner_id: Optional[int] = Field(default=None, index=True)  # Dla kompatybilności
```

### Tabela: userthermostat (Many-to-Many)
```sql
CREATE TABLE userthermostat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id),
    thermostat_id INTEGER NOT NULL REFERENCES thermostat(id),
    is_owner BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, thermostat_id)
);
CREATE INDEX ix_userthermostat_user_id ON userthermostat (user_id);
CREATE INDEX ix_userthermostat_thermostat_id ON userthermostat (thermostat_id);
```

**Model SQLModel:**
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

### Tabela: thermostatsetting
```sql
CREATE TABLE thermostatsetting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thermostat_id INTEGER NOT NULL REFERENCES thermostat(id),
    target_temp_c REAL DEFAULT 21.0,
    mode VARCHAR DEFAULT 'auto',
    last_source VARCHAR DEFAULT 'app',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_thermostatsetting_thermostat_id ON thermostatsetting (thermostat_id);
```

**Model SQLModel:**
```python
class ThermostatSetting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    target_temp_c: float = 21.0
    mode: str = "auto"
    last_source: Optional[str] = "app"  # "app" | "device"
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Tabela: reading
```sql
CREATE TABLE reading (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thermostat_id INTEGER NOT NULL REFERENCES thermostat(id),
    temperature_c REAL NOT NULL,
    humidity_pct REAL,
    pressure_hpa REAL,
    window_open_detected BOOLEAN DEFAULT FALSE,
    is_heating BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_reading_thermostat_id ON reading (thermostat_id);
CREATE INDEX ix_reading_created_at ON reading (created_at);
```

**Model SQLModel:**
```python
class Reading(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    temperature_c: float
    humidity_pct: Optional[float] = None
    pressure_hpa: Optional[float] = None
    window_open_detected: Optional[bool] = False
    is_heating: Optional[bool] = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### Tabela: scheduletemplate
```sql
CREATE TABLE scheduletemplate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thermostat_id INTEGER NOT NULL REFERENCES thermostat(id),
    name VARCHAR DEFAULT 'Domyślny harmonogram',
    description VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_scheduletemplate_thermostat_id ON scheduletemplate (thermostat_id);
```

**Model SQLModel:**
```python
class ScheduleTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    name: str = "Domyślny harmonogram"
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### Tabela: scheduleentry
```sql
CREATE TABLE scheduleentry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thermostat_id INTEGER NOT NULL REFERENCES thermostat(id),
    template_id INTEGER REFERENCES scheduletemplate(id),
    weekday INTEGER NOT NULL,
    start TIME NOT NULL,
    end TIME NOT NULL,
    target_temp_c REAL NOT NULL
);
CREATE INDEX ix_scheduleentry_thermostat_id ON scheduleentry (thermostat_id);
CREATE INDEX ix_scheduleentry_weekday ON scheduleentry (weekday);
```

**Model SQLModel:**
```python
class ScheduleEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thermostat_id: int = Field(index=True, foreign_key="thermostat.id")
    template_id: Optional[int] = Field(default=None, foreign_key="scheduletemplate.id")
    weekday: int  # 0-6 (0=poniedziałek)
    start: time   # time object
    end: time     # time object
    target_temp_c: float
```

## 3. RELACJE MIĘDZY TABELAMI

### Relacja User ↔ Thermostat (Many-to-Many)
- **Tabela pośrednia**: `userthermostat`
- **Klucze obce**: user_id → user.id, thermostat_id → thermostat.id
- **Pole `is_owner`**: rozróżnienie właściciela od użytkowników z dostępem
- **Ograniczenie UNIQUE**: `(user_id, thermostat_id)` - jeden użytkownik może mieć tylko jeden wpis dla danego termostatu

### ⚠️ **WAŻNE - Własność termostatu (źródło prawdy)**
System używa **podwójnego mechanizmu własności** z okresem przejściowym:

1. **Thermostat.owner_id** (stary model) - dla kompatybilności wstecznej
   - Używane w endpointach: PUT/DELETE `/thermostats/{tid}`, POST `/thermostats`
   - Sprawdzane przy tworzeniu/edycji/usuwaniu termostatów
   - **DEPRECATED** - zachowane tylko dla kompatybilności

2. **UserThermostat.is_owner** (nowy model) - aktualny system
   - Używane w GET `/thermostats` dla określenia uprawnień w UI
   - Pozwala na wiele właścicieli jednego termostatu
   - **RECOMMENED** - docelowy mechanizm własności

**Strategia migracji:**
- Nowe funkcje (udostępnianie, panel admin) używają tylko UserThermostat.is_owner
- Stare endpointy (CRUD termostatów) nadal sprawdzają owner_id dla bezpieczeństwa
- W przyszłości owner_id będzie usunięty po pełnej migracji logiki

### Relacja Thermostat → ThermostatSetting (One-to-One)
- **Klucz obcy**: thermostat_id → thermostat.id
- **Każdy termostat ma dokładnie jedno ustawienie**

### Relacja Thermostat → Reading (One-to-Many)
- **Klucz obcy**: thermostat_id → thermostat.id
- **Jeden termostat może mieć wiele odczytów w czasie**
- **Indeks na created_at** dla szybkiego sortowania chronologicznego

### Relacja Thermostat → ScheduleTemplate (One-to-Many)
- **Klucz obcy**: thermostat_id → thermostat.id
- **Jeden termostat może mieć wiele szablonów harmonogramów**

### Relacja ScheduleTemplate → ScheduleEntry (One-to-Many)
- **Klucz obcy**: template_id → scheduletemplate.id (opcjonalny)
- **Wpisy harmonogramu mogą istnieć bez szablonu (template_id = NULL)**

### Relacja Thermostat → ScheduleEntry (One-to-Many)
- **Klucz obcy**: thermostat_id → thermostat.id
- **Bezpośrednia relacja dla wpisów harmonogramu**

## 4. INDEKSY BAZODANOWE

### Indeksy podstawowe (PRIMARY KEY)
- Wszystkie tabele mają automatyczne indeksy na `id` (klucz główny)

### Indeksy dla wydajności
```sql
-- Wyszukiwanie użytkowników po email (logowanie)
CREATE INDEX ix_user_email ON user (email);

-- Wyszukiwanie termostatów użytkownika
CREATE INDEX ix_userthermostat_user_id ON userthermostat (user_id);
CREATE INDEX ix_userthermostat_thermostat_id ON userthermostat (thermostat_id);

-- Wyszukiwanie ustawień termostatu
CREATE INDEX ix_thermostatsetting_thermostat_id ON thermostatsetting (thermostat_id);

-- Wyszukiwanie odczytów termostatu i sortowanie chronologiczne
CREATE INDEX ix_reading_thermostat_id ON reading (thermostat_id);
CREATE INDEX ix_reading_created_at ON reading (created_at);

-- Harmonogramy według termostatu i dnia tygodnia
CREATE INDEX ix_scheduleentry_thermostat_id ON scheduleentry (thermostat_id);
CREATE INDEX ix_scheduleentry_weekday ON scheduleentry (weekday);
```

## 5. OGRANICZENIA I WALIDACJA

### Ograniczenia na poziomie bazy
- **UNIQUE**: email w tabeli user
- **UNIQUE**: (user_id, thermostat_id) w tabeli userthermostat
- **FOREIGN KEY**: wszystkie relacje z CASCADE (implicit w SQLModel)
- **NOT NULL**: pola wymagane (temperature_c, user_id, thermostat_id, itp.)

### Walidacja na poziomie aplikacji (Pydantic)
```python
class SettingsIn(BaseModel):
    target_temp_c: float = Field(ge=-40, le=85)  # -40°C do +85°C
    mode: str = Field(regex="^(auto|heat|off)$")

class ScheduleIn(BaseModel):
    weekday: int = Field(ge=0, le=6)  # 0-6 (poniedziałek-niedziela)
    start: str = Field(regex="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # HH:MM
    end: str = Field(regex="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")    # HH:MM
    target_temp_c: float = Field(ge=-40, le=85)
```

## 6. INICJALIZACJA I DANE TESTOWE

### Automatyczna inicjalizacja (create_db())
```python
def create_db():
    # Tworzenie wszystkich tabel
    SQLModel.metadata.create_all(engine)
    
    # Tworzenie domyślnego użytkownika admin
    u = User(email="admin@example.com", password_hash=pwd_context.hash("admin123"))
    
    # Tworzenie domyślnego termostatu
    t = Thermostat(name="Salon", owner_id=u.id)
    
    # Tworzenie domyślnych ustawień
    setting = ThermostatSetting(
        thermostat_id=t.id, 
        target_temp_c=21.0, 
        mode="auto", 
        last_source="app"
    )
```

### Dane przykładowe
- **Admin user**: admin@example.com / admin123
- **Termostat**: "Salon" z ustawieniami 21°C, tryb auto
- **Powiązanie**: admin jest właścicielem termostatu

## 7. BEZPIECZEŃSTWO DANYCH

### Hashing haseł
- **Algorytm**: PBKDF2-SHA256 (CryptContext)
- **Biblioteka**: `passlib[bcrypt]`
- **Konfiguracja**: `schemes=["pbkdf2_sha256"], deprecated="auto"`

### Konfiguracja połączeń
```python
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
```

### Środowiska
- **Development**: SQLite local file `heatbeat.db`
- **Production**: Zmienna środowiskowa `DATABASE_URL`
- **Docker**: Bind mount dla persistence

## 8. MIGRACJE I WERSJONOWANIE

### Automatyczne tworzenie
- **SQLModel.metadata.create_all()** przy starcie aplikacji
- **IF NOT EXISTS** dla bezpiecznego uruchamiania

### Strategia aktualizacji
- Dodawanie nowych pól z wartościami domyślnymi
- Zachowanie kompatybilności wstecznej (`owner_id` w tabeli thermostat)
- Migracja do Alembic w przyszłości dla bardziej złożonych zmian

## 9. WYDAJNOŚĆ I OPTYMALIZACJA

### Strategie indeksowania
- Indeksy na klucze obce dla JOIN operations
- Indeks na created_at dla sortowania chronologicznego
- Indeks na weekday dla szybkiego wyszukiwania harmonogramów

### Zapytania optymalizowane
```python
# Efektywne pobieranie termostatów użytkownika z JOIN
stmt = (
    select(Thermostat, UserThermostat.is_owner)
    .join(UserThermostat, UserThermostat.thermostat_id == Thermostat.id)
    .where(UserThermostat.user_id == user.id)
)

# Limit odczytów dla wydajności
readings = s.exec(
    select(Reading)
    .where(Reading.thermostat_id == id)
    .order_by(Reading.created_at.desc())
    .limit(limit or 50)
).all()
```

### Strategia archiwizacji
- Planowane: archiwizacja starych odczytów (>3 miesiące)
- Planowane: agregacja danych historycznych (średnie dzienne/tygodniowe)

## 11. WAŻNE DECYZJE PROJEKTOWE

### 11.1. Identyfikacja urządzeń IoT (device_id vs thermostat_id)

System **NIE MA osobnej tabeli Device** - urządzenia IoT są bezpośrednio identyfikowane przez `thermostat_id`.

**API dla urządzeń IoT:**
```http
POST /device/{tid}/reading        # tid = thermostat_id  
GET  /device/{tid}/settings       # tid = thermostat_id
PUT  /device/{device_id}/settings # device_id = thermostat_id (inconsistency)
PUT  /device/{tid}/target-temp    # tid = thermostat_id
```

**⚠️ INCONSISTENCY w API:**
- Większość endpointów używa `{tid}` (thermostat_id)
- Endpoint `PUT /device/{device_id}/settings` używa `{device_id}`
- **W praktyce: device_id === thermostat_id** (ta sama wartość)

**Uzasadnienie projektowe:**
1. **Jeden termostat = jedno urządzenie IoT** - relacja 1:1
2. **Brak potrzeby oddzielnej tabeli Device** - nie ma dodatkowych metadanych urządzenia
3. **Termostat.id służy jednocześnie jako device_id** w komunikacji IoT
4. **Uproszczenie architektury** - mniej tabel, prostsze relacje

**Przykład identyfikacji:**
```python
# W urządzeniu RP2350:
DEVICE_ID = 1  # To samo co thermostat_id w bazie

# Wysłanie odczytu:
POST http://server/device/1/reading  # 1 = thermostat_id

# W bazie danych:
# thermostat.id = 1
# reading.thermostat_id = 1  (foreign key)
```

### 11.2. Ewolucja modelu własności

**Problem:** System przeszedł ewolucję od modelu 1:1 (jeden właściciel) do modelu many-to-many (wielu użytkowników może mieć dostęp).

**Rozwiązanie przejściowe:**
- **Stary model:** `Thermostat.owner_id` (używany w CRUD operations)
- **Nowy model:** `UserThermostat.is_owner` (używany w UI i sharing)

**Docelowa architektura:** Pełne przejście na UserThermostat.is_owner z usunięciem owner_id.

### Konfiguracja Docker
```yaml
# docker-compose.yml
environment:
  - DATABASE_URL=sqlite:///./heatbeat.db
  - JWT_SECRET=dev_secret_change_me

volumes:
  backend_data:  # Dla persistence bazy danych
```

### Ścieżki plików
- **SQLite file**: `./heatbeat.db` (relatywna do working directory)
- **Volume mount**: Zapewnia persistence między restartami kontenerów
- **Backup**: Możliwość kopiowania pliku .db dla backup

## 10. ZGODNOŚĆ Z DOCKER I DEPLOYMENT
