"""Admin-only user management."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import public_user, require_roles
from app.database import ROLES, User, get_db

router = APIRouter()


@router.get("/admin/users")
def list_users(admin: User = Depends(require_roles()), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id).all()
    out = []
    for u in users:
        item = public_user(u)
        # Admin can view captured signatures.
        item["signature_png"] = u.signature_png
        out.append(item)
    return out


class UserPatch(BaseModel):
    role: str | None = None
    active: bool | None = None


@router.patch("/admin/users/{user_id}")
def update_user(
    user_id: int,
    patch: UserPatch,
    admin: User = Depends(require_roles()),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if patch.role is not None:
        if patch.role not in ROLES:
            raise HTTPException(400, f"Unknown role '{patch.role}'")
        if user.id == admin.id and patch.role != "admin":
            raise HTTPException(400, "You cannot demote your own admin account")
        user.role = patch.role

    if patch.active is not None:
        if user.id == admin.id and not patch.active:
            raise HTTPException(400, "You cannot deactivate your own account")
        user.active = patch.active

    db.commit()
    item = public_user(user)
    item["signature_png"] = user.signature_png
    return item
