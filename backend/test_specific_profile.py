import asyncio
import httpx

async def test_specific_profile():
    user_id = "6c692259-0e12-4c44-9264-52e97c9a74c4" # From dump
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(f"http://localhost:8000/users/profile/{user_id}")
        if profile_resp.status_code == 200:
            profile = profile_resp.json()
            print(f"Profile API City: {profile.get('city')}")
            print(f"Full Profile: {profile}")
        else:
            print(f"Profile API failed: {profile_resp.status_code}")

if __name__ == "__main__":
    asyncio.run(test_specific_profile())
