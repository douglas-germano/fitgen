import urllib.request
import json
import sys

# 1. Register
url = "http://localhost:5000/api/auth/register"
data = {
    "email": "test_notif_fix_internal_v3@example.com",
    "password": "Password123!",
    "name": "Test Internal",
    "phone": "5511999999999"
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})

token = None

print("Registering...")
try:
    with urllib.request.urlopen(req) as response:
        resp_json = json.loads(response.read().decode())
        print("Registration Response:", resp_json)
        if 'access_token' in resp_json:
            token = resp_json['access_token']
except urllib.error.HTTPError as e:
    err_body = e.read().decode()
    print(f"Registration HTTP Error: {e.code} {err_body}")
    if "User already exists" in err_body:
         # Login instead
         pass

if not token:
    print("Logging in...")
    login_url = "http://localhost:5000/api/auth/login"
    login_data = {"email": "test_notif_fix_internal_v3@example.com", "password": "Password123!"}
    l_req = urllib.request.Request(login_url, data=json.dumps(login_data).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(l_req) as response:
            resp_json = json.loads(response.read().decode())
            print("Login Response:", resp_json)
            token = resp_json.get('access_token')
    except urllib.error.HTTPError as e:
        print(f"Login HTTP Error: {e.code} {e.read().decode()}")
        sys.exit(1)

if not token:
    print("Failed to get token")
    sys.exit(1)

# 2. Register Device
print("Registering Device...")
dev_url = "http://localhost:5000/api/notifications/register-device"
dev_data = {
    "platform": "web",
    "device_name": "Test Runner Internal",
    "subscription": {
        "endpoint": "https://fcm.googleapis.com/fcm/send/fake-endpoint-123",
        "keys": {
            "p256dh": "fake_key_p256dh_sample_string_must_be_long_enough",
            "auth": "fake_auth_secret_key"
        }
    }
}
d_req = urllib.request.Request(dev_url, data=json.dumps(dev_data).encode(), headers={
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
})

try:
    with urllib.request.urlopen(d_req) as response:
        print("Device Registration Response:", response.read().decode())
        print("SUCCESS: Device registered without 500!")
except urllib.error.HTTPError as e:
    print(f"Device Registration FAILED: {e.code} {e.read().decode()}")
    sys.exit(1)
