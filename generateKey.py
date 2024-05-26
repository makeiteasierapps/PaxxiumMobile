import secrets
import base64

def generate_api_key():
    # Generate 32 bytes of random data
    random_bytes = secrets.token_bytes(32)
    # Encode these bytes in URL-safe base64
    api_key = base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')
    return api_key

# Generate an API key
api_key = generate_api_key()
print("Generated API Key:", api_key)