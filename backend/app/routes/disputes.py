from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.event import Booking, Dispute, Event, Notification, Payout, CancellationPolicy
from app.models.schemas import (
    CancellationPolicyResponse,
    CancellationPolicyUpdate,
    DisputeCreate,
    DisputeResolve,
    DisputeResponse,
)
from app.models.user import User

router = APIRouter(prefix="/api/disputes", tags=["disputes"])


@router.post("", response_model=DisputeResponse)
def create_dispute(
    data: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    dispute = Dispute(
        event_id=data.event_id,
        booking_id=data.booking_id,
        filed_by=current_user.id,
        filed_against=data.filed_against,
        dispute_type=data.dispute_type,
        description=data.description,
    )
    db.add(dispute)

    # Notify admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title="New Dispute Filed",
            message=f"{current_user.full_name} filed a {data.dispute_type} dispute for event '{event.name}'",
            notification_type="dispute",
            reference_id=dispute.id,
        )
        db.add(notif)

    db.commit()
    db.refresh(dispute)

    resp = DisputeResponse.model_validate(dispute)
    resp.filed_by_name = current_user.full_name
    if data.filed_against:
        target = db.query(User).filter(User.id == data.filed_against).first()
        resp.filed_against_name = target.full_name if target else None
    return resp


@router.get("", response_model=list[DisputeResponse])
def list_my_disputes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    disputes = (
        db.query(Dispute)
        .filter((Dispute.filed_by == current_user.id) | (Dispute.filed_against == current_user.id))
        .order_by(Dispute.created_at.desc())
        .all()
    )
    results = []
    for d in disputes:
        resp = DisputeResponse.model_validate(d)
        filer = db.query(User).filter(User.id == d.filed_by).first()
        resp.filed_by_name = filer.full_name if filer else None
        if d.filed_against:
            target = db.query(User).filter(User.id == d.filed_against).first()
            resp.filed_against_name = target.full_name if target else None
        results.append(resp)
    return results


# ---- Cancellation Policies ----

@router.get("/policies", response_model=list[CancellationPolicyResponse])
def list_policies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    policies = db.query(CancellationPolicy).all()
    return [CancellationPolicyResponse.model_validate(p) for p in policies]


@router.put("/policies/{policy_type}", response_model=CancellationPolicyResponse)
def update_policy(
    policy_type: str,
    data: CancellationPolicyUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.policy_type == policy_type).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(policy, key, value)

    db.commit()
    db.refresh(policy)
    return CancellationPolicyResponse.model_validate(policy)


# ---- Admin Dispute Management ----

@router.get("/admin/all", response_model=list[DisputeResponse])
def list_all_disputes(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(Dispute)
    if status:
        query = query.filter(Dispute.status == status)
    disputes = query.order_by(Dispute.created_at.desc()).all()
    results = []
    for d in disputes:
        resp = DisputeResponse.model_validate(d)
        filer = db.query(User).filter(User.id == d.filed_by).first()
        resp.filed_by_name = filer.full_name if filer else None
        if d.filed_against:
            target = db.query(User).filter(User.id == d.filed_against).first()
            resp.filed_against_name = target.full_name if target else None
        results.append(resp)
    return results


@router.get("/{dispute_id}", response_model=DisputeResponse)
def get_dispute(
    dispute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    if current_user.role != "admin" and dispute.filed_by != current_user.id and dispute.filed_against != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    resp = DisputeResponse.model_validate(dispute)
    filer = db.query(User).filter(User.id == dispute.filed_by).first()
    resp.filed_by_name = filer.full_name if filer else None
    if dispute.filed_against:
        target = db.query(User).filter(User.id == dispute.filed_against).first()
        resp.filed_against_name = target.full_name if target else None
    return resp


@router.put("/{dispute_id}/resolve", response_model=DisputeResponse)
def resolve_dispute(
    dispute_id: str,
    data: DisputeResolve,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = data.status
    dispute.resolution = data.resolution
    dispute.resolved_by = current_user.id
    dispute.refund_amount = data.refund_amount
    dispute.payout_adjustment = data.payout_adjustment

    # Notify involved parties
    for uid in [dispute.filed_by, dispute.filed_against]:
        if uid:
            notif = Notification(
                user_id=uid,
                title="Dispute Updated",
                message=f"Your dispute has been {data.status}. Resolution: {data.resolution[:100]}",
                notification_type="dispute",
                reference_id=dispute.id,
            )
            db.add(notif)

    db.commit()
    db.refresh(dispute)

    resp = DisputeResponse.model_validate(dispute)
    filer = db.query(User).filter(User.id == dispute.filed_by).first()
    resp.filed_by_name = filer.full_name if filer else None
    if dispute.filed_against:
        target = db.query(User).filter(User.id == dispute.filed_against).first()
        resp.filed_against_name = target.full_name if target else None
    return resp
