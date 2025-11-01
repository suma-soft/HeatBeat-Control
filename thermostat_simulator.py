#!/usr/bin/env python3
"""
Symulator termostatu do testowania bidirectional communication
"""

import requests
import time
import json
from datetime import datetime

# Konfiguracja
BACKEND_URL = "http://localhost:8000"
DEVICE_ID = 1
POLL_INTERVAL = 3  # Co 3 sekundy sprawdzaj ustawienia
SIMULATED_TEMP = 22.0  # Aktualna temperatura w pomieszczeniu

def log(msg):
    """Helper do logowania z timestampem"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_settings():
    """Pobierz ustawienia z backendu"""
    try:
        response = requests.get(f"{BACKEND_URL}/device/{DEVICE_ID}/settings")
        if response.status_code == 200:
            return response.json()
        else:
            log(f"❌ Błąd pobierania ustawień: {response.status_code}")
            return None
    except Exception as e:
        log(f"❌ Błąd połączenia: {e}")
        return None

def send_temperature_change(new_temp, source="device"):
    """Wyślij zmianę temperatury do backendu"""
    try:
        data = {
            "target_temp_c": new_temp,
            "source": source
        }
        response = requests.put(f"{BACKEND_URL}/device/{DEVICE_ID}/settings", json=data)
        if response.status_code == 200:
            log(f"✅ Wysłano zmianę temperatury: {new_temp}°C (źródło: {source})")
            return True
        else:
            log(f"❌ Błąd wysyłania: {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Błąd połączenia: {e}")
        return False

def simulate_device_temp_change():
    """Symuluj zmianę temperatury bezpośrednio na termostacie"""
    import random
    new_temp = round(random.uniform(18.0, 26.0), 1)
    log(f"🎛️  Użytkownik zmienił temperaturę na termostacie: {new_temp}°C")
    return send_temperature_change(new_temp, "device")

def main():
    log("🏠 Start symulatora termostatu")
    log(f"📡 Backend: {BACKEND_URL}")
    log(f"🆔 Device ID: {DEVICE_ID}")
    log("📝 Komendy:")
    log("   - Naciśnij ENTER aby zmienić temperaturę na termostacie")
    log("   - Ctrl+C aby zakończyć")
    print()
    
    last_known_temp = None
    last_known_source = None
    
    # Test połączenia
    settings = get_settings()
    if settings:
        log(f"✅ Połączenie OK, obecne ustawienia: {settings}")
        last_known_temp = settings.get('target_temp_c')
        last_known_source = settings.get('last_source')
    else:
        log("❌ Brak połączenia z backendem")
        return
    
    last_poll = 0
    
    try:
        while True:
            current_time = time.time()
            
            # Polling co POLL_INTERVAL sekund
            if current_time - last_poll >= POLL_INTERVAL:
                settings = get_settings()
                if settings:
                    new_temp = settings.get('target_temp_c')
                    new_source = settings.get('last_source')
                    
                    # Sprawdź czy temperatura się zmieniła
                    if new_temp != last_known_temp:
                        if new_source == 'app':
                            log(f"📱 Nowa temperatura z aplikacji: {new_temp}°C")
                            log(f"🔥 Termostat aktualizuje zadaną temperaturę na wyświetlaczu")
                        elif new_source == 'device':
                            log(f"🎛️  Potwierdzenie zmiany z termostatu: {new_temp}°C")
                        
                        last_known_temp = new_temp
                        last_known_source = new_source
                
                last_poll = current_time
            
            # Sprawdź input od użytkownika (non-blocking)
            import select
            import sys
            
            if select.select([sys.stdin], [], [], 0.1)[0]:
                sys.stdin.readline()  # Odczytaj enter
                simulate_device_temp_change()
                time.sleep(0.5)  # Krótka pauza po zmianie
            
            time.sleep(0.1)  # Krótka pauza w pętli głównej
            
    except KeyboardInterrupt:
        log("👋 Koniec symulacji")

if __name__ == "__main__":
    main()