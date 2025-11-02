import sqlite3

conn = sqlite3.connect('heatbeat.db')
cursor = conn.cursor()

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:", tables)

# Check ScheduleTemplate table
try:
    cursor.execute("SELECT * FROM ScheduleTemplate LIMIT 1;")
    print("ScheduleTemplate table exists")
except sqlite3.OperationalError as e:
    print("ScheduleTemplate table error:", e)

# Check ScheduleEntry table structure
try:
    cursor.execute("PRAGMA table_info(ScheduleEntry);")
    columns = cursor.fetchall()
    print("ScheduleEntry columns:", columns)
except sqlite3.OperationalError as e:
    print("ScheduleEntry table error:", e)

conn.close()