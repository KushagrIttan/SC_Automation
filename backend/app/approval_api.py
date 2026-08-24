"""Approval workflow with real role-based authorization.

Approvers are Users (role prof / dean; admin may act anywhere).
- submit: owner of the sheet or admin
- approve/reject: admin, or a user routed to the sheet via stage_approvers
- approval_status: owner, any routed approver, dean, admin
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auth import get_current_user, require_roles
from app.database import (
    get_db,
    User,
    ApprovalStage,
    StageApprover,
    Notesheet,
)

router = APIRouter()


class ApproveRequest(BaseModel):
    pass  # signing user comes from the session


class RejectRequest(BaseModel):
    reason: str = ""


def _load_notesheet(db: Session, ns_id: str) -> Notesheet:
    ns = db.query(Notesheet).filter(Notesheet.id == ns_id).first()
    if not ns:
        raise HTTPException(404, "Notesheet not found")
    return ns


def _sheet_stage_rows(db: Session, ns_id: str) -> list:
    return (
        db.query(ApprovalStage)
        .filter(ApprovalStage.notesheet_id == ns_id)
        .order_by(ApprovalStage.stage_order)
        .all()
    )


def _ensure_stages(db: Session, ns: Notesheet) -> list:
    """Create stages from the stored chain if missing, assigning the first
    active prof as each stage's initial approver."""
    stages = _sheet_stage_rows(db, ns)
    if stages:
        return stages

    import json

    try:
        chain = json.loads(ns.approval_chain_json or "[]")
    except Exception:
        chain = []

    first_prof = (
        db.query(User)
        .filter(User.role == "prof", User.active.is_(True))
        .order_by(User.id)
        .first()
    )
    if not first_prof:
        raise HTTPException(
            400, "No professors registered — ask an admin to seed approver accounts"
        )

    for i, name in enumerate(chain, start=1):
        stage = ApprovalStage(notesheet_id=ns.id, stage_order=i, name=name)
        db.add(stage)
        db.flush()
        # Route final authority stages to a dean when one exists.
        is_final = i == len(chain) and "dean" in name.lower() or "registrar" in name.lower()
        approver = first_prof
        if is_final:
            dean = (
                db.query(User)
                .filter(User.role.in_(("dean", "admin")), User.active.is_(True))
                .order_by(User.id)
                .first()
            )
            if dean:
                approver = dean
        db.add(StageApprover(stage_id=stage.id, prof_id=approver.id))
    db.commit()
    return _sheet_stage_rows(db, ns.id)


def _can_view(user: User, ns: Notesheet, stages: list) -> bool:
    if user.role in ("dean", "admin"):
        return True
    if ns.requester_id == user.id:
        return True
    return any(
        sa.prof_id == user.id for stage in stages for sa in stage.stage_approvers
    )


@router.post("/notesheets/{ns_id}/submit")
def submit_notesheet(
    ns_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ns = _load_notesheet(db, ns_id)
    if ns.requester_id != user.id and user.role != "admin":
        raise HTTPException(403, "Only the requester who created this note sheet can submit it")
    if ns.status != "draft":
        raise HTTPException(409, f"Only draft note sheets can be submitted (current status: {ns.status})")
    _ensure_stages(db, ns)
    ns.status = "pending_approval"
    db.commit()

    stages = _sheet_stage_rows(db, ns)
    return {
        "id": ns.id,
        "status": ns.status,
        "routed_to": [
            {"stage": s.name, "approver": sa.user.name}
            for s in stages
            for sa in s.stage_approvers
        ],
    }


@router.post("/notesheets/{ns_id}/approve")
def approve_notesheet(ns_id: str, db: Session = Depends(get_db),
                      user: User = Depends(require_roles("prof", "dean"))):
    ns = _load_notesheet(db, ns_id)
    if ns.status == "draft" and ns.requester_id == user.id:
        ns.status = "pending_approval"
    if ns.status != "pending_approval":
        raise HTTPException(409, f"Cannot approve a note sheet in status '{ns.status}'")

    stages = _ensure_stages(db, ns)

    current = next(
        (s for s in stages if any(sa.status == "pending" for sa in s.stage_approvers)),
        None,
    )
    if current is None:
        pending_left = (
            db.query(StageApprover)
            .join(ApprovalStage, StageApprover.stage_id == ApprovalStage.id)
            .filter(ApprovalStage.notesheet_id == ns.id, StageApprover.status == "pending")
            .count()
        )
        if pending_left == 0 and ns.status != "approved":
            ns.status = "approved"
            db.commit()
            return {"id": ns.id, "status": ns.status, "signed_by": user.name, "stages_left": 0}
        raise HTTPException(409, "All stages already decided")

    # Authorization: non-admin must actually be routed on this stage.
    my_row = next((sa for sa in current.stage_approvers if sa.prof_id == user.id), None)
    if user.role != "admin" and my_row is None:
        raise HTTPException(
            403, f"You are not an approver on '{current.name}' of this note sheet"
        )

    from app.database import StageApprover as SA

    row = my_row or SA(stage_id=current.id, prof_id=user.id)
    row.status = "approved"
    row.approved_at = datetime.now(timezone.utc)

    # A stage is decided by its signer: drop placeholder rows on this stage.
    for x in list(current.stage_approvers):
        if x.prof_id != user.id and x.status == "pending":
            db.delete(x)
    db.commit()

    pending_left = (
        db.query(StageApprover)
        .join(ApprovalStage, StageApprover.stage_id == ApprovalStage.id)
        .filter(ApprovalStage.notesheet_id == ns.id, StageApprover.status == "pending")
        .count()
    )
    ns.status = "approved" if pending_left == 0 else "pending_approval"
    db.commit()

    return {
        "id": ns.id,
        "status": ns.status,
        "signed_by": user.name,
        "signature": user.signature_png,
        "stage": current.name,
        "stages_left": pending_left,
    }


@router.post("/notesheets/{ns_id}/reject")
def reject_notesheet(ns_id: str, body: RejectRequest, db: Session = Depends(get_db),
                     user: User = Depends(require_roles("prof", "dean"))):
    ns = _load_notesheet(db, ns_id)
    if ns.status not in ("draft", "pending_approval"):
        raise HTTPException(409, f"Cannot reject a note sheet in status '{ns.status}'")

    stages = _ensure_stages(db, ns)
    current = next(
        (s for s in stages if any(sa.status == "pending" for sa in s.stage_approvers)),
        None,
    )
    if current is None:
        raise HTTPException(409, "No pending stage to reject")

    target = next((sa for sa in current.stage_approvers if sa.status == "pending"), None)
    if user.role != "admin":
        mine = [sa for sa in current.stage_approvers if sa.prof_id == user.id]
        if not mine:
            raise HTTPException(403, f"You are not an approver on '{current.name}' of this note sheet")
        target = mine[0]

    target.status = "rejected"
    target.rejection_reason = body.reason or None
    ns.status = "rejected"
    db.commit()

    return {
        "id": ns.id,
        "status": ns.status,
        "rejected_stage": current.name,
        "rejected_by": user.name,
        "reason": body.reason,
    }


@router.get("/notesheets/{ns_id}/approval_status")
def get_approval_status(ns_id: str, db: Session = Depends(get_db),
                        user: User = Depends(get_current_user)):
    ns = _load_notesheet(db, ns_id)
    stages = _sheet_stage_rows(db, ns)
    if not _can_view(user, ns, stages):
        raise HTTPException(403, "You do not have access to this note sheet")
    return {
        "notesheet_id": ns.id,
        "status": ns.status,
        "requester_id": ns.requester_id,
        "stages": [
            {
                "stage_order": s.stage_order,
                "name": s.name,
                "approvers": [
                    {
                        "user_id": sa.prof_id,
                        "name": sa.user.name if sa.user else None,
                        "signature": sa.user.signature_png if sa.user else None,
                        "status": sa.status,
                        "approved_at": sa.approved_at.isoformat() if sa.approved_at else None,
                        "rejection_reason": sa.rejection_reason,
                    }
                    for sa in s.stage_approvers
                ],
            }
            for s in stages
        ],
    }
