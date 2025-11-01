# Instrukcje przebudowy Docker

## Problem identyfikowany w logach:
```
PUT /device/1/settings HTTP/1.1" 405 Method Not Allowed
```

To oznacza, że Docker używa starej wersji kodu backend bez naszych zmian.

## Rozwiązanie:

1. **Zatrzymaj Docker Compose:**
```bash
docker-compose down
```

2. **Przebuduj obrazy:**
```bash
docker-compose build --no-cache
```

3. **Uruchom ponownie:**
```bash
docker-compose up
```

## Lub wszystko na raz:
```bash
docker-compose down && docker-compose build --no-cache && docker-compose up
```

## Zmiany w kodzie:

### Backend:
- ✅ Dodany endpoint `PUT /device/{device_id}/settings`
- ✅ Model `DeviceSettings` 
- ✅ Model `DeviceReading` z `setpoint_c`
- ✅ Rozszerzony endpoint `POST /device/{tid}/reading`

### Frontend:
- ✅ Dodana funkcja `checkSettingsUpdate()` 
- ✅ Auto-polling sprawdza teraz również settings co `pollMs` sekund
- ✅ Inteligentne komunikaty o źródle zmian ("z termostatu" vs "z aplikacji")
- ✅ Wyświetlanie źródła przy zadanej temperaturze

## Po przebudowie:
- Termostat będzie mógł wysyłać `PUT /device/1/settings`  
- Frontend będzie automatycznie wyświetlał zmiany z termostatu
- Oba kierunki komunikacji będą działać: app ↔ thermostat