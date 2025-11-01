# Modyfikacje Backend dla Termostatu

## Zmiany dokonane w `backend/main.py`

### 1. Dodane modele danych

```python
class DeviceSettings(BaseModel):
    target_temp_c: float
    source: str = "device"  # "device" lub "app"

class DeviceReading(BaseModel):
    temperature_c: float
    humidity_pct: float  
    pressure_hpa: float
    setpoint_c: float
```

### 2. Nowy endpoint PUT /device/{device_id}/settings

```python
@app.put("/device/{device_id}/settings")
def device_update_settings(device_id: int, settings: DeviceSettings):
    """Endpoint PUT dla termostatu do aktualizacji temperatury zadanej"""
```

**Format żądania:**
```json
{
    "target_temp_c": 25.5,
    "source": "device"
}
```

**Format odpowiedzi:**
```json
{
    "status": "ok"
}
```

### 3. Rozszerzony endpoint POST /device/{tid}/reading

- Obsługuje zarówno `ReadingIn` jak i `DeviceReading`
- Automatycznie aktualizuje ustawienia termostatu gdy otrzymuje `setpoint_c`
- Ustawia `last_source = "device"` gdy wykryje zmianę temperatury zadanej

### 4. Pole last_source jako opcjonalne

```python
class ThermostatSetting(SQLModel, table=True):
    # ...
    last_source: Optional[str] = "app"  # Opcjonalne dla kompatybilności
    # ...
```

## Endpointy dostępne dla termostatu

### 1. PUT /device/{device_id}/settings
- **Cel**: Aktualizacja temperatury zadanej przez termostat
- **Metoda**: PUT
- **Body**: `{"target_temp_c": 25.5, "source": "device"}`
- **Odpowiedź**: `{"status": "ok"}`

### 2. POST /device/{tid}/reading  
- **Cel**: Heartbeat i monitoring + opcjonalna aktualizacja setpoint
- **Metoda**: POST
- **Body**: `{"temperature_c": 23.45, "humidity_pct": 58.2, "pressure_hpa": 1001.13, "setpoint_c": 25.5}`
- **Odpowiedź**: `{"ok": True, "id": 123, "at": "2025-10-31T..."}`

### 3. GET /device/{device_id}/settings
- **Cel**: Synchronizacja ustawień
- **Metoda**: GET  
- **Odpowiedź**: `{"target_temp_c": 25.5, "mode": "auto", "last_source": "device", "updated_at": "2025-10-31T..."}`

## Protokół komunikacji

### Termostat → Backend (zmiana temperatury lokalnie):
1. **Preferowany sposób**: `PUT /device/1/settings` z `{"target_temp_c": 26.5, "source": "device"}`
2. **Alternatywny sposób**: `POST /device/1/reading` z `setpoint_c` w danych

### Backend → Termostat (synchronizacja):
1. Termostat sprawdza co 8-30s: `GET /device/1/settings`
2. Sprawdza pole `last_source`:
   - Jeśli `"app"` → aktualizuj lokalną wartość (zmiana z aplikacji)
   - Jeśli `"device"` → ignoruj (to nasza zmiana)

### Heartbeat (co 15s):
1. `POST /device/1/reading` z danymi środowiskowymi + aktualną temperaturą zadaną

## Status implementacji ✅

- ✅ Model `DeviceSettings` dodany
- ✅ Model `DeviceReading` dodany  
- ✅ Endpoint `PUT /device/{device_id}/settings` zaimplementowany
- ✅ Endpoint `POST /device/{tid}/reading` rozszerzony
- ✅ Endpoint `GET /device/{tid}/settings` już istniał
- ✅ Pole `last_source` jako opcjonalne dla kompatybilności
- ✅ Frontend zaktualizowany do obsługi `last_source`

Backend jest teraz w pełni kompatybilny z oprogramowaniem termostatu!