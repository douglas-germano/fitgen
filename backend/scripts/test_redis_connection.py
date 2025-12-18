
import redis
import sys
import os

def test_redis():
    # Try getting host from env, default to 'redis'
    host = os.getenv('REDIS_HOST', 'redis')
    port = int(os.getenv('REDIS_PORT', 6379))
    
    print(f"Testing connection to Redis at {host}:{port}...")
    
    try:
        r = redis.Redis(host=host, port=port, socket_timeout=5)
        if r.ping():
            print("âœ… Redis Connection Successful!")
        else:
            print("â Œ Redis Ping Failed!")
            sys.exit(1)
            
    except redis.ConnectionError as e:
        print(f"â Œ Redis Connection Error: {e}")
        # Try fallback hostname
        if host == 'redis':
            print("Trying fallback host 'fitgen_redis'...")
            try:
                r = redis.Redis(host='fitgen_redis', port=port, socket_timeout=5)
                if r.ping():
                    print("âœ… Redis Connection Successful using 'fitgen_redis'!")
                    print("SUGGESTION: Update .env REDIS_HOST to 'fitgen_redis'")
                else: 
                     print("â Œ Fallback also failed.")
            except Exception as e2:
                print(f"â Œ Fallback failed: {e2}")

        sys.exit(1)
    except Exception as e:
         print(f"â Œ Unexpected Error: {e}")
         sys.exit(1)

if __name__ == "__main__":
    test_redis()
