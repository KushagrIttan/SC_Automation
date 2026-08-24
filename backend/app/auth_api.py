"""Signup / login / profile endpoints."""

import base64

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.auth import create_token, get_current_user, hash_password, public_user, verify_password
from app.database import User, get_db

router = APIRouter()

SIGNATURE_ROLES = ("club_lead", "prof", "dean")
# Admin is never self-selectable — seeded directly into the DB.
SELF_SELECTABLE_ROLES = ("student", "club_lead", "prof", "dean")


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    department: str | None = None
    position: str | None = None
    signature_png: str | None = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/auth/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if req.role not in SELF_SELECTABLE_ROLES:
        raise HTTPException(400, f"Role '{req.role}' cannot be selected at signup")

    if db.query(User).filter(User.email == req.email.lower()).first():
        raise HTTPException(409, "An account with this email already exists")

    if req.role in SIGNATURE_ROLES:
        sig = req.signature_png or ""
        if not sig.startswith("data:image/png;base64,"):
            raise HTTPException(
                400,
                f"A drawn signature is required for the {req.role} role",
            )
        try:
            raw = base64.b64decode(sig.split(",", 1)[1], validate=True)
            if len(raw) > 500_000:
                raise ValueError
        except Exception:
            raise HTTPException(400, "Signature image is invalid or too large")
    else:
        sig = None

    user = User(
        email=req.email.lower(),
        name=req.name.strip(),
        password_hash=hash_password(req.password),
        role=req.role,
        department=(req.department or "").strip() or None,
        position=(req.position or "").strip() or None,
        signature_png=sig,
    )
    db.add(user)
    db.commit()
    return {"token": create_token(user), "user": public_user(user)}


@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.active:
        raise HTTPException(403, "This account has been deactivated")
    return {"token": create_token(user), "user": public_user(user)}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return public_user(user)
