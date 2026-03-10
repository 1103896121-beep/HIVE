import urllib.request
import json

url = "http://localhost:8000/social/bonds/2f6d4a4c-1eaf-4503-baa4-b6c4fa3add60"
try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print(f"Total bonds: {len(data)}")
        if data:
            print(f"Sample bond keys: {list(data[0].keys())}")
            if 'other_user' in data[0]:
                print(f"other_user keys: {list(data[0]['other_user'].keys())}")
            else:
                print("MISSING 'other_user' KEY!")
except Exception as e:
    print(f"Error: {e}")
