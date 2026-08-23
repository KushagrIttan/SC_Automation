from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db, Prof, ApprovalStage, StageApprover, Notesheet

router = APIRouter()


class ProfCreate(BaseModel):
    name: str
    email: str
    position: str


class ApproveRequest(BaseModel):
    prof_id: Optional[int] = None


class RejectRequest(BaseModel):
    reason: str = ""


def _ensure_stages(db: Session, ns: Notesheet) -> list:
    """Create approval stages from the stored chain if they don't exist yet."""
    stages = (
        db.query(ApprovalStage)
        .filter(ApprovalStage.notesheet_id == ns.id)
        .order_by(ApprovalStage.stage_order)
        .all()
    )
    if stages:
        return stages

    try:
        chain: List[str] = __import__("json").loads(ns.approval_chain_json or "[]")
    except Exception:
        chain = []
    for i, name in enumerate(chain, start=1):
        stage = ApprovalStage(notesheet_id=ns.id, stage_order=i, name=name)
        db.add(stage)
        db.flush()
        prof = _pick_prof(db, None)
        db.add(StageApprover(stage_id=stage.id, prof_id=prof.id))
    db.commit()
    return (
        db.query(ApprovalStage)
        .filter(ApprovalStage.notesheet_id == ns.id)
        .order_by(ApprovalStage.stage_order)
        .all()
    )


def _pick_prof(db: Session, prof_id: Optional[int]) -> Prof:
    if prof_id is not None:
        prof = db.query(Prof).filter(Prof.id == prof_id).first()
        if not prof:
            raise HTTPException(404, f"Prof {prof_id} not found")
        return prof
    prof = db.query(Prof).order_by(Prof.id).first()
    if not prof:
        raise HTTPException(400, "No professors registered. POST /api/profs first.")
    return prof


def _load_notesheet(db: Session, ns_id: str) -> Notesheet:
    ns = db.query(Notesheet).filter(Notesheet.id == ns_id).first()
    if not ns:
        raise HTTPException(404, "Notesheet not found")
    return ns


@router.post('/profs')
def create_prof(prof: ProfCreate, db: Session = Depends(get_db)):
    db_prof = Prof(**prof.model_dump())
    db.add(db_prof)
    db.commit()
    return {'id': db_prof.id, 'name': db_prof.name}


@router.post('/approval_stages')
def create_approval_stage(notesheet_id: str, stage_order: int, name: str, prof_ids: List[int], db: Session = Depends(get_db)):
    _load_notesheet(db, notesheet_id)
    db_stage = ApprovalStage(notesheet_id=notesheet_id, stage_order=stage_order, name=name)
    db.add(db_stage)
    db.commit()
    for prof_id in prof_ids:
        db.add(StageApprover(stage_id=db_stage.id, prof_id=prof_id))
    db.commit()
    return {'id': db_stage.id}


@router.post('/notesheets/{ns_id}/submit')
def submit_notesheet(ns_id: str, db: Session = Depends(get_db)):
    """Move a draft into the approval pipeline (seeds stages from the suggested chain)."""
    ns = _load_notesheet(db, ns_id)
    if ns.status != 'draft':
        raise HTTPException(409, f"Only draft note sheets can be submitted (current status: {ns.status})")
    _ensure_stages(db, ns)
    ns.status = 'pending_approval'
    db.commit()
    return {'id': ns.id, 'status': ns.status}


@router.post('/notesheets/{ns_id}/approve')
def approve_notesheet(ns_id: str, body: ApproveRequest, db: Session = Depends(get_db)):
    ns = _load_notesheet(db, ns_id)
    if ns.status == 'draft':
        ns.status = 'pending_approval'
    if ns.status not in ('pending_approval',):
        raise HTTPException(409, f"Cannot approve a note sheet in status '{ns.status}'")

    stages = _ensure_stages(db, ns)
    current = next(
        (s for s in stages if any(sa.status == 'pending' for sa in s.stage_approvers)),
        None,
    )
    if current is None:
        pending_left = (
            db.query(StageApprover)
            .join(ApprovalStage, StageApprover.stage_id == ApprovalStage.id)
            .filter(ApprovalStage.notesheet_id == ns.id, StageApprover.status == 'pending')
            .count()
        )
        if pending_left == 0 and ns.status != 'approved':
            ns.status = 'approved'
            db.commit()
            return {'id': ns.id, 'status': ns.status, 'approved_stage': None, 'stages_left': 0}
        raise HTTPException(409, "All stages already decided")

    approver = _pick_prof(db, body.prof_id)
    sa = next((x for x in current.stage_approvers if x.prof_id == approver.id), None)
    if sa is None:
        sa = StageApprover(stage_id=current.id, prof_id=approver.id)
        db.add(sa)
        db.flush()

    from datetime import datetime, timezone
    sa.status = 'approved'
    sa.approved_at = datetime.now(timezone.utc)

    # A stage is decided by its signer: drop auto-created placeholder rows
    # for this stage so "pending" always means a real outstanding signature.
    for x in list(current.stage_approvers):
        if x.prof_id != approver.id and x.status == 'pending':
            db.delete(x)
    db.commit()

    # Recount outstanding signatures with a fresh query (relationship
    # collections can be stale after deletes).
    pending_left = (
        db.query(StageApprover)
        .join(ApprovalStage, StageApprover.stage_id == ApprovalStage.id)
        .filter(ApprovalStage.notesheet_id == ns.id, StageApprover.status == 'pending')
        .count()
    )
    if pending_left == 0:
        ns.status = 'approved'
    else:
        ns.status = 'pending_approval'
    db.commit()

    return {
        'id': ns.id,
        'status': ns.status,
        'approved_stage': {'order': current.stage_order, 'name': current.name, 'prof': approver.name},
        'stages_left': pending_left,
    }


@router.post('/notesheets/{ns_id}/reject')
def reject_notesheet(ns_id: str, body: RejectRequest, db: Session = Depends(get_db)):
    ns = _load_notesheet(db, ns_id)
    if ns.status not in ('draft', 'pending_approval'):
        raise HTTPException(409, f"Cannot reject a note sheet in status '{ns.status}'")

    stages = _ensure_stages(db, ns)
    current = next(
        (s for s in stages if any(sa.status == 'pending' for sa in s.stage_approvers)),
        stages[0],
    )
    sa = next((x for x in current.stage_approvers if x.status == 'pending'), None)
    if sa is None:
        raise HTTPException(409, "No pending approver on the current stage")

    sa.status = 'rejected'
    sa.rejection_reason = body.reason or None
    ns.status = 'rejected'
    db.commit()

    prof_name = sa.prof.name if sa.prof else f"prof {sa.prof_id}"
    return {
        'id': ns.id,
        'status': ns.status,
        'rejected_stage': {'order': current.stage_order, 'name': current.name, 'prof': prof_name},
        'reason': body.reason,
    }


@router.get('/notesheets/{ns_id}/approval_status')
def get_approval_status(ns_id: str, db: Session = Depends(get_db)):
    ns = _load_notesheet(db, ns_id)
    stages = (
        db.query(ApprovalStage)
        .filter(ApprovalStage.notesheet_id == ns_id)
        .order_by(ApprovalStage.stage_order)
        .all()
    )
    return {
        'notesheet_id': ns.id,
        'status': ns.status,
        'stages': [
            {
                'stage_order': stage.stage_order,
                'name': stage.name,
                'approvers': [
                    {
                        'prof_id': sa.prof_id,
                        'prof_name': sa.prof.name if sa.prof else None,
                        'status': sa.status,
                        'approved_at': sa.approved_at.isoformat() if sa.approved_at else None,
                        'rejection_reason': sa.rejection_reason,
                    }
                    for sa in stage.stage_approvers
                ],
            }
            for stage in stages
        ],
    }
