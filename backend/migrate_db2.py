import sqlite3

# Connect to database
conn = sqlite3.connect('heatbeat.db')
cursor = conn.cursor()

try:
    # Add last_source column to ThermostatSetting table
    cursor.execute("ALTER TABLE thermostatsetting ADD COLUMN last_source VARCHAR DEFAULT 'app';")
    print("Added last_source column to ThermostatSetting table")
    
    conn.commit()
    
    # Verify the change
    cursor.execute("PRAGMA table_info(thermostatsetting);")
    columns = cursor.fetchall()
    print("Updated ThermostatSetting columns:", columns)
    
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column last_source already exists")
    else:
        print("Error updating database:", e)
    
finally:
    conn.close()