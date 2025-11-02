import sqlite3

# Connect to database
conn = sqlite3.connect('heatbeat.db')
cursor = conn.cursor()

try:
    # Add template_id column to ScheduleEntry table
    cursor.execute("ALTER TABLE scheduleentry ADD COLUMN template_id INTEGER;")
    print("Added template_id column to ScheduleEntry table")
    
    # Add foreign key constraint (if SQLite supports it)
    # Note: This might not work in older SQLite versions
    try:
        cursor.execute("CREATE INDEX idx_scheduleentry_template_id ON scheduleentry(template_id);")
        print("Created index for template_id")
    except sqlite3.OperationalError as e:
        print("Index creation warning:", e)
    
    conn.commit()
    
    # Verify the change
    cursor.execute("PRAGMA table_info(scheduleentry);")
    columns = cursor.fetchall()
    print("Updated ScheduleEntry columns:", columns)
    
except sqlite3.OperationalError as e:
    print("Error updating database:", e)
    
finally:
    conn.close()