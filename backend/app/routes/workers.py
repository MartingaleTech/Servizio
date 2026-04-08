from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.schemas import (
    AvailabilityCreate,
    AvailabilityResponse,
    IDVerificationCreate,
    IDVerificationResponse,
    ShiftAction,
    ShiftResponse,
    WorkerProfileCreate,
    WorkerProfileResponse,
    WorkerProfileUpdate,
)
from app.models.user import IDVerification, User, WorkerAvailability, WorkerProfile
from app.models.event import Event, Payout, Shift, Tip

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.get("/profile/me", response_model=WorkerProfileResponse)
def get_worker_profile(
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")
    resp = WorkerProfileResponse.model_validate(profile)
    resp.full_name = current_user.full_name
    return resp


@router.put("/profile", response_model=WorkerProfileResponse)
def update_worker_profile(
    data: WorkerProfileUpdate,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    resp = WorkerProfileResponse.model_validate(profile)
    resp.full_name = current_user.full_name
    return resp


@router.post("/profile/setup", response_model=WorkerProfileResponse)
def setup_worker_profile(
    data: WorkerProfileCreate,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        profile = WorkerProfile(user_id=current_user.id)
        db.add(profile)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    resp = WorkerProfileResponse.model_validate(profile)
    resp.full_name = current_user.full_name
    return resp


# ---- ID Verification ----

@router.post("/verification", response_model=IDVerificationResponse)
def submit_verification(
    data: IDVerificationCreate,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(IDVerification)
        .filter(IDVerification.user_id == current_user.id, IDVerification.status == "pending")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending verification request")

    verification = IDVerification(
        user_id=current_user.id,
        government_id_front_url=data.government_id_front_url,
        government_id_back_url=data.government_id_back_url,
        selfie_url=data.selfie_url,
    )
    db.add(verification)

    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if profile:
        profile.verification_status = "pending"

    db.commit()
    db.refresh(verification)
    return IDVerificationResponse.model_validate(verification)


@router.get("/verification", response_model=Optional[IDVerificationResponse])
def get_my_verification(
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    verification = (
        db.query(IDVerification)
        .filter(IDVerification.user_id == current_user.id)
        .order_by(IDVerification.created_at.desc())
        .first()
    )
    if not verification:
        return None
    return IDVerificationResponse.model_validate(verification)


# ---- Availability ----

@router.post("/availability", response_model=AvailabilityResponse)
def add_availability(
    data: AvailabilityCreate,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    availability = WorkerAvailability(
        user_id=current_user.id,
        day_of_week=data.day_of_week,
        specific_date=data.specific_date,
        start_time=data.start_time,
        end_time=data.end_time,
        is_unavailable=data.is_unavailable,
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return AvailabilityResponse.model_validate(availability)


@router.get("/availability", response_model=list[AvailabilityResponse])
def get_availability(
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    availabilities = (
        db.query(WorkerAvailability)
        .filter(WorkerAvailability.user_id == current_user.id)
        .all()
    )
    return [AvailabilityResponse.model_validate(a) for a in availabilities]


@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: str,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    availability = (
        db.query(WorkerAvailability)
        .filter(
            WorkerAvailability.id == availability_id,
            WorkerAvailability.user_id == current_user.id,
        )
        .first()
    )
    if not availability:
        raise HTTPException(status_code=404, detail="Availability entry not found")
    db.delete(availability)
    db.commit()
    return {"message": "Deleted"}


# ---- Shifts (Worker's view) ----

@router.get("/shifts", response_model=list[ShiftResponse])
def get_my_shifts(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    query = db.query(Shift).filter(Shift.worker_id == current_user.id)
    if status:
        query = query.filter(Shift.status == status)
    shifts = query.order_by(Shift.created_at.desc()).all()

    results = []
    for shift in shifts:
        event = db.query(Event).filter(Event.id == shift.event_id).first()
        resp = ShiftResponse.model_validate(shift)
        resp.event_name = event.name if event else None
        resp.worker_name = current_user.full_name
        results.append(resp)
    return results


@router.post("/shifts/{shift_id}/action", response_model=ShiftResponse)
def shift_action(
    shift_id: str,
    data: ShiftAction,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    shift = (
        db.query(Shift)
        .filter(Shift.id == shift_id, Shift.worker_id == current_user.id)
        .first()
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    if data.action == "accept":
        if shift.status != "assigned":
            raise HTTPException(status_code=400, detail="Can only accept assigned shifts")
        shift.status = "accepted"
    elif data.action == "decline":
        if shift.status not in ("assigned", "accepted"):
            raise HTTPException(status_code=400, detail="Cannot decline this shift")
        shift.status = "declined"
    elif data.action == "on_the_way":
        if shift.status != "accepted":
            raise HTTPException(status_code=400, detail="Must accept shift first")
        shift.status = "on_the_way"
    elif data.action == "clock_in":
        if shift.status not in ("accepted", "on_the_way"):
            raise HTTPException(status_code=400, detail="Cannot clock in for this shift")
        # V1: Time window restriction - can only clock in within 30 minutes of planned start
        now = datetime.now(timezone.utc)
        if shift.planned_start:
            planned_start = shift.planned_start.replace(tzinfo=timezone.utc) if shift.planned_start.tzinfo is None else shift.planned_start
            minutes_before = (planned_start - now).total_seconds() / 60
            if minutes_before > 30:
                raise HTTPException(status_code=400, detail=f"Too early to clock in. You can clock in starting 30 minutes before your shift.")
        shift.status = "clocked_in"
        shift.clock_in_time = now
    elif data.action == "clock_out":
        if shift.status != "clocked_in":
            raise HTTPException(status_code=400, detail="Must clock in first")
        shift.status = "clocked_out"
        shift.clock_out_time = datetime.now(timezone.utc)
        if shift.clock_in_time:
            clock_in = shift.clock_in_time.replace(tzinfo=timezone.utc) if shift.clock_in_time.tzinfo is None else shift.clock_in_time
            delta = shift.clock_out_time - clock_in
            shift.hours_worked = round(delta.total_seconds() / 3600, 2)
            # V1: Overtime detection
            if shift.planned_end:
                planned_end = shift.planned_end.replace(tzinfo=timezone.utc) if shift.planned_end.tzinfo is None else shift.planned_end
                planned_start = shift.planned_start.replace(tzinfo=timezone.utc) if shift.planned_start and shift.planned_start.tzinfo is None else shift.planned_start
                planned_hours = (planned_end - planned_start).total_seconds() / 3600 if planned_start else 0
                if shift.hours_worked > planned_hours + 0.25:  # 15 min grace
                    shift.is_overtime = True
                    shift.overtime_hours = round(shift.hours_worked - planned_hours, 2)
    elif data.action == "arrived":
        if shift.status != "on_the_way":
            raise HTTPException(status_code=400, detail="Must be on the way first")
        shift.arrived_at = datetime.now(timezone.utc)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {data.action}")

    db.commit()
    db.refresh(shift)

    event = db.query(Event).filter(Event.id == shift.event_id).first()
    resp = ShiftResponse.model_validate(shift)
    resp.event_name = event.name if event else None
    resp.worker_name = current_user.full_name
    return resp


# ---- Earnings ----

@router.get("/earnings")
def get_earnings(
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    payouts = (
        db.query(Payout)
        .filter(Payout.worker_id == current_user.id)
        .order_by(Payout.created_at.desc())
        .all()
    )

    completed_shifts = (
        db.query(Shift)
        .filter(
            Shift.worker_id == current_user.id,
            Shift.status.in_(["clocked_out", "completed"]),
        )
        .all()
    )

    total_earned = sum(p.amount for p in payouts)
    total_pending = sum(
        s.pay_amount or 0 for s in completed_shifts
        if not any(p.shift_id == s.id for p in payouts)
    )

    payout_list = []
    for p in payouts:
        event = db.query(Event).filter(Event.id == p.event_id).first()
        payout_list.append({
            "id": p.id,
            "amount": p.amount,
            "status": p.status,
            "event_name": event.name if event else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        })

    # V1: Enhanced earnings with tips and time breakdown
    tips = (
        db.query(Tip)
        .filter(Tip.to_worker_id == current_user.id)
        .all()
    )
    total_tips = sum(t.amount for t in tips)

    # Weekly/monthly breakdown
    now = datetime.now(timezone.utc)
    week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # Approximate: go back 7 days for weekly
    from datetime import timedelta
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    weekly_payouts = sum(
        p.amount for p in payouts
        if p.created_at and p.created_at >= week_ago
    )
    monthly_payouts = sum(
        p.amount for p in payouts
        if p.created_at and p.created_at >= month_ago
    )
    weekly_tips = sum(
        t.amount for t in tips
        if t.created_at and t.created_at >= week_ago
    )
    monthly_tips = sum(
        t.amount for t in tips
        if t.created_at and t.created_at >= month_ago
    )

    return {
        "total_earned": total_earned,
        "total_pending": total_pending,
        "total_tips": total_tips,
        "weekly_earnings": weekly_payouts,
        "monthly_earnings": monthly_payouts,
        "weekly_tips": weekly_tips,
        "monthly_tips": monthly_tips,
        "payouts": payout_list,
        "completed_shifts_count": len(completed_shifts),
    }
