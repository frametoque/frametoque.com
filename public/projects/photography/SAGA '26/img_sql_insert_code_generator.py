#!/usr/bin/env python3
"""
Generate SQL INSERT statements for the work_photography table
by scanning a folder of images and reading their width/height.

Usage:
    pip install pillow
    python generate_sql_insert.py

Edit the CONFIG section below before running.
"""

import os
from PIL import Image

# ---------------- CONFIG ----------------
# Script lives inside the image folder itself, so just use the current directory.
IMAGE_FOLDER = os.path.dirname(os.path.abspath(__file__))
EVENT_NAME = "SAGA '26"                             # value for event_name column
TABLE_NAME = "work_photography"
OUTPUT_FILE = "insert_statements.sql"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}
# -----------------------------------------


def escape_sql(value: str) -> str:
    """Escape single quotes for safe SQL string literals."""
    return value.replace("'", "''")


def generate_statements(folder: str) -> list:
    statements = []

    if not os.path.isdir(folder):
        print(f"Folder not found: {folder}")
        return statements

    for filename in sorted(os.listdir(folder)):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in VALID_EXTENSIONS:
            continue

        full_path = os.path.join(folder, filename)

        try:
            with Image.open(full_path) as img:
                width, height = img.size
        except Exception as e:
            print(f"Skipping {filename}: could not read image ({e})")
            continue

        src_path = f"/projects/photography/{EVENT_NAME}/{filename}"

        sql = (
            f"INSERT INTO {TABLE_NAME} (event_name, src, width, height) VALUES ("
            f"'{escape_sql(EVENT_NAME)}', "
            f"'{escape_sql(src_path)}', "
            f"{width}, "
            f"{height});"
        )
        statements.append(sql)

    return statements


def main():
    statements = generate_statements(IMAGE_FOLDER)

    if not statements:
        print("No SQL statements generated. Check IMAGE_FOLDER path and contents.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(statements) + "\n")

    print(f"Generated {len(statements)} INSERT statements -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()