import os
import re
import sys

FRONTEND_DIR = r"e:\workrooten\Hive\frontend\src"
BACKEND_DIR = r"e:\workrooten\Hive\backend\app"

def scan_frontend():
    print("--- Scanning Frontend ---")
    violations = []
    for root, _, files in os.walk(FRONTEND_DIR):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        # Rule: No dangerouslySetInnerHTML
                        if 'dangerouslySetInnerHTML' in line:
                            violations.append(f"[Security] {filepath}:{i+1} : {line.strip()}")
                        # Rule: No any type (except in comments)
                        if re.search(r'\b(as\s+any|:\s*any\b)', line) and not line.strip().startswith('//'):
                            violations.append(f"[Type] {filepath}:{i+1} : {line.strip()}")
    
    if not violations:
        print("Frontend: No basic violations found.")
    else:
        for v in violations:
            print(v)

def scan_backend():
    print("\n--- Scanning Backend ---")
    violations = []
    api_dir = os.path.join(BACKEND_DIR, 'api')
    for root, _, files in os.walk(BACKEND_DIR):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                in_api_layer = filepath.startswith(api_dir)
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        stripped = line.strip()
                        # Rule: No bare except
                        if re.match(r'^except\s*:$', stripped):
                            violations.append(f"[Style] {filepath}:{i+1} : Bare except found")
                        # Rule: No print (except in main or scripts, but let's flag them all in app/)
                        if re.search(r'\bprint\(', stripped) and not stripped.startswith('#'):
                            violations.append(f"[Log] {filepath}:{i+1} : print() used instead of logging")
                        # Rule: API layer should not hit DB directly (db.commit, db.execute, db.add)
                        if in_api_layer and not stripped.startswith('#'):
                            if re.search(r'\bdb\.(commit|execute|add|delete|query)\b', stripped):
                                violations.append(f"[Architecture] {filepath}:{i+1} : DB operation in API layer: {stripped}")
    
    if not violations:
        print("Backend: No basic violations found.")
    else:
        for v in violations:
            print(v)

if __name__ == "__main__":
    scan_frontend()
    scan_backend()
