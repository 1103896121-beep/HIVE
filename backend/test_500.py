from fastapi.testclient import TestClient
import traceback
import sys

# 修改导入路径
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.main import app
except Exception as e:
    print("Failed to import app:", str(e))
    traceback.print_exc()
    sys.exit(1)

client = TestClient(app)

print("=== TEST 1: Root ===")
try:
    res = client.get("/")
    print("Status:", res.status_code)
    print("Body:", res.text)
except Exception as e:
    print("Root Crash:", str(e))
    traceback.print_exc()

print("\n=== TEST 2: /api/v1/focus/subjects ===")
try:
    res = client.get("/api/v1/focus/subjects")
    print("Status:", res.status_code)
    print("Body:", res.text)
except Exception as e:
    print("Subjects Crash:", str(e))
    traceback.print_exc()

print("\n=== TEST 3: /api/v1/squads (Creation with No Auth) ===")
try:
    res = client.post("/api/v1/squads", json={"name": "Test", "is_private": False})
    print("Status:", res.status_code)
    print("Body:", res.text)
except Exception as e:
    print("Squads Crash:", str(e))
    traceback.print_exc()
