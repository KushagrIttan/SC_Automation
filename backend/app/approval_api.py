from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, Prof, ApprovalStage, StageApprover

router = APIRouter()

# Models
class ProfCreate(BaseModel):
    name: str
    email: str
    position: str

class ApprovalStageCreate(BaseModel):
    notesheet_id: int
    stage_order: int
    prof_ids: List[int]

@router.post('/profs')
def create_prof(prof: ProfCreate, db: Session = Depends(get_db)):
    db_prof = Prof(**prof.dict())
    db.add(db_prof)
    db.commit()
    return {'id': db_prof.id}

@router.post('/approval_stages')
def create_approval_stage(stage: ApprovalStageCreate, db: Session = Depends(get_db)):
    db_stage = ApprovalStage(notesheet_id=stage.notesheet_id, stage_order=stage.stage_order)
    db.add(db_stage)
    db.commit()
    
    for prof_id in stage.prof_ids:
        db_approver = StageApprover(stage_id=db_stage.id, prof_id=prof_id)
        db.add(db_approver)
    db.commit()
    return {'id': db_stage.id}

@router.get('/notesheets/{id}/approval_status')
def get_approval_status(id: int, db: Session = Depends(get_db)):
    stages = db.query(ApprovalStage).filter(ApprovalStage.notesheet_id == id).all()
    return {
        'stages': [
            {
                'stage_order': stage.stage_order,
                'approvers': [
                    {
                        'prof_id': sa.prof_id,
                        'status': sa.status,
                        'rejection_reason': sa.rejection_reason
                    } for sa in stage.stage_approvers
                ]
            } for stage in stages
        ]
    }