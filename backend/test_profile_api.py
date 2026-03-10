import asyncio
import httpx
from uuid import UUID

async def test_api():
    async with httpx.AsyncClient() as client:
        # First, search for users to get some IDs
        response = await client.get("http://localhost:8000/users/search?q=Wang")
        if response.status_code == 200:
            users = response.json()
            if users:
                user_id = users[0]['id']
                print(f"Testing profile for user {user_id} ({users[0]['name']})")
                
                # Test search result city
                print(f"Search Result City: {users[0].get('city')}")
                
                # Test profile endpoint
                profile_resp = await client.get(f"http://localhost:8000/users/profile/{user_id}")
                if profile_resp.status_code == 200:
                    profile = profile_resp.json()
                    print(f"Profile API City: {profile.get('city')}")
                    print(f"Full Profile keys: {list(profile.keys())}")
                else:
                    print(f"Profile API failed: {profile_resp.status_code}")
            else:
                print("No users found in search.")
        else:
            print(f"Search API failed: {response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_api())
