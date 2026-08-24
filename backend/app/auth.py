"""Authentication: password hashing, JWT issuing/validation, role guards.

Prototype-grade on purpose: PBKDF2-SHA256 password hashing (200k iterations),
short-lived-ish HS256 JWTs, and dependency-based role checks. No refresh
tokens, OAuth, or email verification — none of that is needed for the demo.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import User, get_db

_ITERATIONS = 200_000
_TOKEN_TTL_HOURS = 24 * 7
_ALGORITHM = "HS256"

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), _ITERATIONS)
        return secrets.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=_TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, settings.auth_secret, algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired — log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid session token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(401, "Authentication required")
    claims = _decode(credentials.credentials)
    user = db.query(User).filter(User.id == int(claims["sub"])).first()
    if not user:
        raise HTTPException(401, "Account no longer exists")
    if not user.active:
        raise HTTPException(403, "This account has been deactivated")
    return user


def require_roles(*roles: str):
    """Dependency factory: allow only the listed roles (admins always pass)."""
    label = ", ".join(roles) if roles else "admin"
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != "admin" and user.role not in roles:
            raise HTTPException(403, f"Requires {label} access (your role: {user.role})")
        return user
    return checker


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "department": user.department,
        "position": user.position,
        "has_signature": bool(user.signature_png),
        "active": user.active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
