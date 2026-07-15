"""
PAI Database Migration Script
Adds new columns for the professional CV schema redesign.
Safe to run multiple times — checks if columns already exist before adding.
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "placement_ai.db")

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"[Migration] Database not found at {DB_PATH}. Skipping — tables will be created on first run.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    migrations = [
        # User table
        ("users", "languages", "TEXT DEFAULT '[]'"),
        ("users", "goals", "TEXT DEFAULT '[]'"),

        # Education table
        ("education", "major", "VARCHAR(150)"),
        ("education", "graduation_year", "VARCHAR(10)"),

        # WorkExperience table
        ("work_experience", "start_date", "VARCHAR(30)"),
        ("work_experience", "end_date", "VARCHAR(30) DEFAULT 'Present'"),
        ("work_experience", "achievements", "TEXT DEFAULT '[]'"),

        # Projects table
        ("projects", "link_or_credential", "VARCHAR(255)"),
    ]

    applied = 0
    for table, column, col_type in migrations:
        if not column_exists(cursor, table, column):
            sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
            cursor.execute(sql)
            print(f"  [+] Added {table}.{column} ({col_type})")
            applied += 1
        else:
            print(f"  [=] {table}.{column} already exists, skipping")

    conn.commit()
    conn.close()

    if applied > 0:
        print(f"\n[Migration] Done. {applied} column(s) added successfully.")
    else:
        print(f"\n[Migration] All columns already present. Nothing to do.")

if __name__ == "__main__":
    print("[Migration] Starting PAI database migration...\n")
    migrate()
