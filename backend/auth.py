import urllib.request
import urllib.parse
import json
from typing import Optional

def verify_google_token(token: str) -> Optional[dict]:
    """
    Verifies Google JWT ID token. Returns profile details if valid.
    Supports mock token verification for developer mode testing.
    """
    # Support mock login for local testing/development
    if token.startswith("mock_token_"):
        user_id = token.replace("mock_token_", "")
        return {
            "id": f"mock_{user_id}",
            "email": f"{user_id}@example.com",
            "name": user_id.capitalize(),
            "picture": "https://www.gravatar.com/avatar/?d=mp"
        }
        
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(token)}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if "sub" in data:
                return {
                    "id": data["sub"],
                    "email": data.get("email"),
                    "name": data.get("name"),
                    "picture": data.get("picture")
                }
    except Exception as e:
        print(f"Token verification error: {e}")
    return None
