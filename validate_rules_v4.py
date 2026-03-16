import os
import re

FRONTEND_DIR = 'frontend/src'
BACKEND_DIR = 'backend/app'

def scan_backend():
    print("--- Scanning Backend ---")
    violations = 0
    for root, _, files in os.walk(BACKEND_DIR):
        for file in files:
            if not file.endswith('.py'): continue
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                # Check bare except
                for i, line in enumerate(lines):
                    if re.search(r'^\s*except\s*:\s*$', line):
                        print(f"[BARE EXCEPT] {path}:{i+1}")
                        violations += 1
                
                # Check print
                for i, line in enumerate(lines):
                    if re.search(r'\bprint\(', line):
                        print(f"[PRINT USED] {path}:{i+1}")
                        violations += 1

                # Check layering: api should not use db.add, db.commit, db.execute
                if 'api' in root.split(os.sep):
                    for i, line in enumerate(lines):
                        if re.search(r'\bdb\.(add|commit|execute|delete|refresh)\b', line):
                            print(f"[LAYER VIOLATION] DB op in API layer - {path}:{i+1}")
                            violations += 1

                # Check missing type hints in function defs
                for i, line in enumerate(lines):
                    if line.strip().startswith('def '):
                        if '->' not in line and not '__init__' in line:
                            print(f"[MISSING TYPE HINT - RETURN] {path}:{i+1} : {line.strip()}")
                            violations += 1
                        # Check params (very rudimentary regex)
                        params = re.search(r'def \w+\((.*?)\)', line)
                        if params:
                            p_str = params.group(1).replace('self', '').replace('cls', '').strip()
                            if p_str and ':' not in p_str:
                                print(f"[MISSING TYPE HINT - PARAM] {path}:{i+1} : {line.strip()}")
                                violations += 1
                                
    return violations

def scan_frontend():
    print("--- Scanning Frontend ---")
    violations = 0
    for root, _, files in os.walk(FRONTEND_DIR):
        for file in files:
            if not file.endswith(('.ts', '.tsx')): continue
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

                # Check dangerouslySetInnerHTML
                if 'dangerouslySetInnerHTML' in content:
                    print(f"[XSS RISK] dangerouslySetInnerHTML in {path}")
                    violations += 1

                # Check implicit any
                for i, line in enumerate(lines):
                    if re.search(r'\b(any)\b', line) and not 'eslint-disable' in line:
                        print(f"[ANY TYPE] {path}:{i+1} : {line.strip()}")
                        violations += 1

    return violations

def main():
    bv = scan_backend()
    fv = scan_frontend()
    print(f"\nTotal Backend Violations: {bv}")
    print(f"Total Frontend Violations: {fv}")

if __name__ == '__main__':
    main()
