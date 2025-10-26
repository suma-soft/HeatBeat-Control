# 🌡️ HeatBeat Control

**HeatBeat Control** to aplikacja webowa i backend FastAPI do zdalnego zarządzania inteligentnym termostatem
zbudowanym na platformie **Waveshare RP2350-Touch-AMOLED-1.43** z czujnikiem **BME280**.

Projekt stanowi element systemu *HeatBeat*, który umożliwia:
- zdalne ustawianie temperatury i trybu pracy termostatów,
- podgląd aktualnych odczytów z czujników (temperatura, wilgotność, ciśnienie),
- rejestrowanie danych pomiarowych w bazie,
- komunikację z urządzeniami IoT (termostaty RP2350) w czasie rzeczywistym.

---

## 🧱 Architektura

┌────────────────────────────┐
│ HeatBeat-Control Frontend │ ← React + Tailwind + Vite (port 5173)
│ (PWA Web UI) │
└───────────────┬────────────┘
│ REST API (HTTP)
┌───────────────▼────────────┐
│ HeatBeat-Control Backend │ ← FastAPI + SQLModel + JWT Auth (port 8000)
│ (API Server) │
└───────────────┬────────────┘
│
┌─────────▼───────────┐
│ RP2350 Thermostat │ ← Waveshare RP2350 Touch AMOLED 1.43
│ + BME280 Sensor │ ← MicroPython / C firmware
│ + Wi-Fi (RM2 module)│
└──────────────────────┘

markdown
Skopiuj kod

- **Frontend (React/Vite)** – panel użytkownika (logowanie, dashboard, odczyty).  
- **Backend (FastAPI)** – REST API, JWT logowanie, zapis i odczyt danych w SQLite.  
- **Termostat RP2350** – wysyła dane z czujnika do API (`POST /device/{id}/reading`)  
  i cyklicznie pobiera nastawy (`GET /device/{id}/settings`).

---

## 🚀 Uruchomienie lokalne (Docker)

Wymagania:
- [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/)
- porty: `8000` (backend), `5173` (frontend)

### 1️⃣ Klonowanie repozytorium

git clone https://github.com/suma-soft/HeatBeat-Control.git
cd HeatBeat-Control
2️⃣ Uruchomienie pełnego środowiska
bash
Skopiuj kod
docker compose build --no-cache
docker compose up -d
Aplikacje wystartują automatycznie:

Usługa	Adres URL	Opis
Frontend	http://localhost:5173	Panel użytkownika (React)
Backend	http://localhost:8000	API + dokumentacja (FastAPI Swagger /docs)

3️⃣ Logowanie testowe
Po pierwszym uruchomieniu automatycznie tworzy się użytkownik:

makefile
Skopiuj kod
Email:    admin@example.com
Hasło:    admin123
Zaloguj się w panelu → zobaczysz Dashboard z danymi domyślnego termostatu „Salon”.

⚙️ Konfiguracja backendu
Zmiennymi środowiskowymi można sterować w docker-compose.yml:

Zmienna	Domyślna wartość	Opis
DATABASE_URL	sqlite:///./heatbeat.db	Ścieżka bazy SQLModel
JWT_SECRET	dev_secret_change_me	Klucz JWT (zmień w produkcji!)

🧩 API – kluczowe endpointy
Endpoint	Metoda	Opis
/auth/register	POST	Rejestracja użytkownika
/auth/login	POST	Logowanie i wydanie tokenu JWT
/auth/me	GET	Dane zalogowanego użytkownika
/thermostats	GET	Lista termostatów użytkownika
/thermostats/{tid}/readings	GET	Ostatnie odczyty z termostatu
/device/{tid}/reading	POST	Dane przesyłane z urządzenia (RP2350)
/device/{tid}/settings	GET	Ustawienia wysyłane do urządzenia

🔌 Połączenie z termostatem RP2350
1️⃣ Konfiguracja Wi-Fi w urządzeniu
W kodzie firmware (MicroPython / C) ustaw parametry:

python
Skopiuj kod
WIFI_SSID = "TwojaSiecWiFi"
WIFI_PASS = "TwojeHaslo"
API_BASE  = "http://<IP_SERWERA>:8000"
DEVICE_ID = 1
Jeżeli backend działa lokalnie na komputerze z adresem 192.168.1.100:

python
Skopiuj kod
API_BASE = "http://192.168.1.100:8000"
2️⃣ Wysyłanie danych z termostatu
Urządzenie powinno cyklicznie wykonywać żądanie HTTP:

http
Skopiuj kod
POST /device/1/reading
Content-Type: application/json

{
  "temperature_c": 21.5,
  "humidity_pct": 45,
  "pressure_hpa": 1013.2,
  "window_open_detected": false
}
3️⃣ Pobieranie ustawień z backendu
Co określony czas (np. co 10 s):

http
Skopiuj kod
GET /device/1/settings
Odpowiedź:

json
Skopiuj kod
{
  "target_temp_c": 22.0,
  "mode": "auto",
  "updated_at": "2025-10-25T10:30:00Z"
}
4️⃣ Logika w mikrokontrolerze
Odczyt z czujnika BME280 przez I²C (adres 0x76).

Wysłanie danych do /device/{id}/reading.

Odbiór nastawy z /device/{id}/settings.

Sterowanie przekaźnikiem / zaworem w zależności od trybu i temperatury.

🖥️ Połączenie front–backend
Frontend React komunikuje się z backendem przez fetch (HTTPS/HTTP).
Adres backendu ustalany jest automatycznie na podstawie bieżącego hosta (http://localhost:8000).

Zmienna środowiskowa:

ini
Skopiuj kod
VITE_API_BASE=http://localhost:8000
zdefiniowana jest w pliku .env w katalogu frontend/.

🧪 Testowanie API ręcznie
Swagger UI:

bash
Skopiuj kod
http://localhost:8000/docs
Przykład curl:

bash
Skopiuj kod
curl -X POST http://localhost:8000/device/1/reading \
  -H "Content-Type: application/json" \
  -d '{"temperature_c": 19.5, "humidity_pct": 50, "pressure_hpa": 1022}'
🧰 Przydatne komendy Docker
Cel	Komenda
pełny restart z usunięciem bazy	docker compose down -v && docker compose build --no-cache && docker compose up -d
przebudowa tylko frontendu	docker compose up -d --build frontend
przebudowa tylko backendu	docker compose up -d --build backend
podgląd logów backendu	docker compose logs -f backend
podgląd logów frontendu	docker compose logs -f frontend

📊 Struktura projektu
bash
Skopiuj kod
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
└── README.md  ← (ten plik)
🧠 Dalszy rozwój
Integracja MQTT lub WebSocket dla komunikacji czasu rzeczywistego

Dodanie harmonogramu tygodniowego (ScheduleEntry) w UI

Funkcja alertów: otwarte okno / zbyt niska temperatura

Logowanie historii i eksport CSV

Tryb Offline Cache w PWA (dla przeglądarki mobilnej)

🧑‍💻 Autor
Projekt: HeatBeat Control
Autor: Maciej Suchecki
Repozytorium: https://github.com/suma-soft/HeatBeat-Control

perl
Skopiuj kod
📡 HeatBeat – inteligentny system sterowania ogrzewaniem.
