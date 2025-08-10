from fastapi import Header, HTTPException, Security
from jose import jwt, JWTError
from app.core.config import settings

def verify_supabase_token(authorization: str = Header(...)):
    token = authorization.split(" ")[1] if " " in authorization else authorization
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
