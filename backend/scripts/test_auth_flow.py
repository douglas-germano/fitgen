
import requests
import sys

BASE_URL = "http://localhost:5000/api"

def test_auth():
    import random
    suffix = random.randint(1000, 9999)
    email = f"test_auth_{suffix}@example.com"
    password = "Password123!"
    name = f"Test User {suffix}"
    phone = f"55119{suffix}8888"
    
    # 1. Register
    print(f"1. Attempting Register: {email}")
    try:
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "name": name,
            "phone": phone
        })
        print(f"   Status: {reg_resp.status_code}")
        print(f"   Response: {reg_resp.text}")
        
    except Exception as e:
        print(f"   Register Failed: {e}")
        # Proceed to login anyway, maybe user exists

    # 2. Login
    print(f"\n2. Attempting Login: {email}")
    try:
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        print(f"   Status: {login_resp.status_code}")
        print(f"   Response: {login_resp.text}")
        
        if login_resp.status_code == 200:
            print("\nâœ… LOGIN SUCCESS! Backend is working.")
            token = login_resp.json().get('access_token')
            print(f"   Token received: {token[:20]}...")
        else:
            print("\nâ Œ LOGIN FAILED! Backend rejected credentials.")
            sys.exit(1)
            
    except Exception as e:
        print(f"   Login Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_auth()
