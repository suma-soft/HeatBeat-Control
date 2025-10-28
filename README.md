# 🌡️ HeatBeat Control

HeatBeat Control to aplikacja webowa (frontend) i backend FastAPI do zdalnego zarządzania inteligentnym termostatem
zbudowanym na platformie Waveshare RP2350-Touch-AMOLED-1.43 z czujnikiem BME280.

Projekt jest częścią systemu HeatBeat i umożliwia:
- zdalne ustawianie temperatury i trybu pracy termostatów,
- podgląd aktualnych odczytów z czujników (temperatura, wilgotność, ciśnienie),
- rejestrowanie danych pomiarowych w bazie,
- komunikację z urządzeniami IoT (termostaty RP2350) w czasie rzeczywistym przez HTTP.

---

## 🧱 Architektura

```mermaid
flowchart TD
    A["Frontend: React + Vite + Tailwind<br/>PWA Web UI (port 5173)"]
    B["Backend: FastAPI + SQLModel + JWT Auth<br/>API Server (port 8000)"]
    C["RP2350 Thermostat<br/>Waveshare RP2350 Touch AMOLED 1.43<br/>BME280 + Wi‑Fi (RM2)"]

    A -->|REST API (HTTP)| B
    C -->|POST /device/:id/reading| B
    C -->|GET /device/:id/settings| B
```

- Frontend (React/Vite) – panel użytkownika (logowanie, dashboard, odczyty).
- Backend (FastAPI) – REST API, JWT logowanie, zapis i odczyt danych (SQLite).
- Termostat RP2350 – publikuje dane i cyklicznie pobiera nastawy.

---

## 🚀 Uruchomienie lokalne (Docker)

Wymagania:
- Docker + Docker Compose
- Porty: 8000 (backend), 5173 (frontend)

### 1️⃣ Klonowanie repozytorium

```bash
git clone https://github.com/suma-soft/HeatBeat-Control.git
cd HeatBeat-Control
```

### 2️⃣ Uruchomienie środowiska

```bash
docker compose build --no-cache
docker compose up -d
```

Aplikacje wystartują automatycznie:

| Usługa   | Adres URL               | Opis                                 |
|----------|--------------------------|--------------------------------------|
| Frontend | http://localhost:5173    | Panel użytkownika (React)            |
| Backend  | http://localhost:8000    | API + dokumentacja (FastAPI Swagger) |

### 3️⃣ Logowanie testowe

Po pierwszym uruchomieniu automatycznie tworzy się użytkownik testowy:

- Email: admin@example.com  
- Hasło: admin123

Zaloguj się w panelu → zobaczysz Dashboard z danymi domyślnego termostatu „Salon”.

---

## ⚙️ Konfiguracja backendu

Zmienne środowiskowe konfiguruje się w `docker-compose.yml`:

| Zmienna     | Domyślna wartość          | Opis                         |
|-------------|----------------------------|------------------------------|
| DATABASE_URL | sqlite:///./heatbeat.db   | Ścieżka bazy SQLModel        |
| JWT_SECRET   | dev_secret_change_me       | Klucz JWT (zmień w produkcji)|

---

## 🧩 API – kluczowe endpointy

| Endpoint                   | Metoda | Opis                                       |
|---------------------------|--------|--------------------------------------------|
| /auth/register            | POST   | Rejestracja użytkownika                    |
| /auth/login               | POST   | Logowanie i wydanie tokenu JWT             |
| /auth/me                  | GET    | Dane zalogowanego użytkownika              |
| /thermostats              | GET    | Lista termostatów użytkownika              |
| /thermostats/{tid}/readings | GET  | Ostatnie odczyty z termostatu              |
| /device/{tid}/reading     | POST   | Dane przesyłane z urządzenia (RP2350)      |
| /device/{tid}/settings    | GET    | Ustawienia wysyłane do urządzenia          |

Dokumentacja Swagger:  
http://localhost:8000/docs

---

## 🔌 Połączenie z termostatem RP2350

### 1️⃣ Konfiguracja Wi‑Fi i API w firmware (MicroPython / C)

```python
WIFI_SSID = "TwojaSiecWiFi"
WIFI_PASS = "TwojeHaslo"
API_BASE  = "http://<IP_SERWERA>:8000"
DEVICE_ID = 1
```

Przykład dla backendu działającego lokalnie (np. komputer 192.168.1.100):

```python
API_BASE = "http://192.168.1.100:8000"
```

### 2️⃣ Wysyłanie danych z termostatu

Urządzenie powinno cyklicznie wykonywać żądanie HTTP:

```http
POST /device/1/reading
Content-Type: application/json

{
  "temperature_c": 21.5,
  "humidity_pct": 45,
  "pressure_hpa": 1013.2,
  "window_open_detected": false
}
```

### 3️⃣ Pobieranie ustawień z backendu

Co określony czas (np. co 10 s):

```http
GET /device/1/settings
```

Przykładowa odpowiedź:

```json
{
  "target_temp_c": 22.0,
  "mode": "auto",
  "updated_at": "2025-10-25T10:30:00Z"
}
```

### 4️⃣ Logika w mikrokontrolerze

- Odczyt z czujnika BME280 przez I²C (adres 0x76).
- Wysłanie danych do `/device/{id}/reading`.
- Odbiór nastaw z `/device/{id}/settings`.
- Sterowanie przekaźnikiem/zaworem w zależności od trybu i temperatury.

---

## 🖥️ Połączenie front–backend

Frontend (React) komunikuje się z backendem przez `fetch` (HTTP/HTTPS).  
Adres backendu ustalany jest przez zmienną środowiskową:

```ini
VITE_API_BASE=http://localhost:8000
```

Zmienna zdefiniowana jest w pliku `.env` w katalogu `frontend/`.

---

## 🧪 Testowanie API ręcznie

Swagger UI:
- http://localhost:8000/docs

Przykład `curl`:

```bash
curl -X POST http://localhost:8000/device/1/reading \
  -H "Content-Type: application/json" \
  -d '{"temperature_c": 19.5, "humidity_pct": 50, "pressure_hpa": 1022}'
```

---

## 🧰 Przydatne komendy Docker

| Cel                                   | Komenda                                                                 |
|---------------------------------------|-------------------------------------------------------------------------|
| Pełny restart z usunięciem bazy       | `docker compose down -v && docker compose build --no-cache && docker compose up -d` |
| Przebudowa tylko frontendu            | `docker compose up -d --build frontend`                                 |
| Przebudowa tylko backendu             | `docker compose up -d --build backend`                                  |
| Podgląd logów backendu                | `docker compose logs -f backend`                                        |
| Podgląd logów frontendu               | `docker compose logs -f frontend`                                       |

---

## 📊 Struktura projektu

```bash
HeatBeat-Control/
│
├── backend/
│   ├── main.py                 # FastAPI + SQLModel + JWT Auth
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/Login.tsx
│   │   ├── pages/Register.tsx
│   │   └── pages/Dashboard.tsx
│   ├── Dockerfile
│   ├── .env
│   └── vite.config.ts
│
├── docker-compose.yml
└── README.md
```

---

## 🧠 Dalszy rozwój (Roadmap)

- Integracja MQTT lub WebSocket dla komunikacji czasu rzeczywistego.
- Dodanie harmonogramu tygodniowego (ScheduleEntry) w UI.
- Alerty: otwarte okno / zbyt niska temperatura.
- Logowanie historii i eksport CSV.
- Tryb Offline Cache w PWA (dla przeglądarki mobilnej).

---

## 🧑‍💻 Autor

- Projekt: HeatBeat Control  
- Autor: Maciej Suchecki  
- Repozytorium: https://github.com/suma-soft/HeatBeat-Control

📡 HeatBeat – inteligentny system sterowania ogrzewaniem.
