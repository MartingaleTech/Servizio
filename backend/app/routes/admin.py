from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import require_role
from app.models.event import Booking, Event, Invoice, Payout, PricingRule, Shift, Notification
from app.models.schemas import (
    AdminStats,
    BookingResponse,
    EventResponse,
    IDVerificationResponse,
    IDVerificationReview,
    InvoiceResponse,
    PayoutResponse,
    PricingRuleResponse,
    PricingRuleUpdate,
    ShiftResponse,
    UserResponse,
    WorkerAssignment,
    WorkerProfileResponse,
)
from app.models.user import CustomerProfile, IDVerification, User, WorkerProfile

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    total_customers = db.query(User).filter(User.role == "customer").count()
    total_workers = db.query(User).filter(User.role == "worker").count()
    total_events = db.query(Event).count()
    total_bookings = db.query(Booking).count()
    pending_verifications = db.query(IDVerification).filter(IDVerification.status == "pending").count()
    total_revenue = db.query(func.coalesce(func.sum(Booking.total_amount), 0)).scalar() or 0
    total_payouts_val = db.query(func.coalesce(func.sum(Payout.amount), 0)).scalar() or 0

    return AdminStats(
        total_users=total_users,
        total_customers=total_customers,
        total_workers=total_workers,
        total_events=total_events,
        total_bookings=total_bookings,
        pending_verifications=pending_verifications,
        total_revenue=float(total_revenue),
        total_payouts=float(total_payouts_val),
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'deactivated' if not user.is_active else 'activated'}"}


# ---- Verifications ----

@router.get("/verifications", response_model=list[IDVerificationResponse])
def list_verifications(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(IDVerification)
    if status:
        query = query.filter(IDVerification.status == status)
    verifications = query.order_by(IDVerification.created_at.desc()).all()
    return [IDVerificationResponse.model_validate(v) for v in verifications]


@router.put("/verifications/{verification_id}", response_model=IDVerificationResponse)
def review_verification(
    verification_id: str,
    data: IDVerificationReview,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    verification = db.query(IDVerification).filter(IDVerification.id == verification_id).first()
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")

    if data.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    verification.status = data.status
    verification.admin_notes = data.admin_notes
    verification.reviewed_by = current_user.id
    verification.reviewed_at = datetime.now(timezone.utc)

    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == verification.user_id).first()
    if profile:
        profile.verification_status = data.status

    notification = Notification(
        user_id=verification.user_id,
        title="Verification Update",
        message=f"Your ID verification has been {data.status}." + (f" Note: {data.admin_notes}" if data.admin_notes else ""),
        notification_type="verification",
        reference_id=verification.id,
    )
    db.add(notification)

    db.commit()
    db.refresh(verification)
    return IDVerificationResponse.model_validate(verification)


# ---- Workers ----

@router.get("/workers", response_model=list[WorkerProfileResponse])
def list_workers(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    profiles = db.query(WorkerProfile).all()
    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        resp = WorkerProfileResponse.model_validate(p)
        resp.full_name = user.full_name if user else None
        results.append(resp)
    return results


# ---- Events ----

@router.get("/events", response_model=list[EventResponse])
def list_all_events(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(Event)
    if status:
        query = query.filter(Event.status == status)
    events = query.order_by(Event.created_at.desc()).all()
    results = []
    for e in events:
        customer = db.query(User).filter(User.id == e.customer_id).first()
        resp = EventResponse.model_validate(e)
        resp.customer_name = customer.full_name if customer else None
        results.append(resp)
    return results


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event_admin(
    event_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    customer = db.query(User).filter(User.id == event.customer_id).first()
    resp = EventResponse.model_validate(event)
    resp.customer_name = customer.full_name if customer else None
    return resp


# ---- Bookings ----

@router.get("/bookings", response_model=list[BookingResponse])
def list_all_bookings(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    bookings = query.order_by(Booking.created_at.desc()).all()
    results = []
    for b in bookings:
        event = db.query(Event).filter(Event.id == b.event_id).first()
        resp = BookingResponse.model_validate(b)
        resp.event_name = event.name if event else None
        results.append(resp)
    return results


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = "cancelled"
    event = db.query(Event).filter(Event.id == booking.event_id).first()
    if event:
        event.status = "cancelled"
    db.commit()
    return {"message": "Booking cancelled"}


# ---- Manual Worker Assignment ----

@router.post("/events/{event_id}/assign", response_model=ShiftResponse)
def assign_worker(
    event_id: str,
    data: WorkerAssignment,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    worker = db.query(User).filter(User.id == data.worker_id, User.role == "worker").first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    booking = db.query(Booking).filter(Booking.event_id == event_id).first()
    if not booking:
        raise HTTPException(status_code=400, detail="No booking found for this event")

    existing = db.query(Shift).filter(
        Shift.event_id == event_id, Shift.worker_id == data.worker_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Worker already assigned to this event")

    hours = max((event.end_datetime - event.start_datetime).total_seconds() / 3600, 1)
    pricing = {}
    rule = db.query(PricingRule).filter(PricingRule.role == data.role).first()
    rate = rule.hourly_rate if rule else 25.0

    shift = Shift(
        event_id=event_id,
        booking_id=booking.id,
        worker_id=data.worker_id,
        role=data.role,
        status="assigned",
        planned_start=event.start_datetime,
        planned_end=event.end_datetime,
        pay_amount=round(rate * hours, 2),
    )
    db.add(shift)

    notification = Notification(
        user_id=data.worker_id,
        title="New Job Assigned",
        message=f"You have been assigned to '{event.name}' as a {data.role}.",
        notification_type="job_available",
        reference_id=event_id,
    )
    db.add(notification)

    db.commit()
    db.refresh(shift)
    resp = ShiftResponse.model_validate(shift)
    resp.event_name = event.name
    resp.worker_name = worker.full_name
    return resp


# ---- Payouts ----

@router.get("/payouts", response_model=list[PayoutResponse])
def list_payouts(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    query = db.query(Payout)
    if status:
        query = query.filter(Payout.status == status)
    payouts = query.order_by(Payout.created_at.desc()).all()
    results = []
    for p in payouts:
        event = db.query(Event).filter(Event.id == p.event_id).first()
        resp = PayoutResponse.model_validate(p)
        resp.event_name = event.name if event else None
        results.append(resp)
    return results


@router.post("/payouts/{payout_id}/process")
def process_payout(
    payout_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    payout = db.query(Payout).filter(Payout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    payout.status = "paid"
    payout.paid_at = datetime.now(timezone.utc)

    notification = Notification(
        user_id=payout.worker_id,
        title="Payment Received",
        message=f"Your payout of ${payout.amount} has been processed.",
        notification_type="payment",
        reference_id=payout.id,
    )
    db.add(notification)

    db.commit()
    return {"message": "Payout processed"}


# ---- Generate Payouts for Completed Events ----

@router.post("/events/{event_id}/generate-payouts")
def generate_payouts(
    event_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    shifts = db.query(Shift).filter(
        Shift.event_id == event_id,
        Shift.status.in_(["clocked_out", "completed"]),
    ).all()

    created = 0
    for shift in shifts:
        existing = db.query(Payout).filter(Payout.shift_id == shift.id).first()
        if existing:
            continue
        payout = Payout(
            worker_id=shift.worker_id,
            shift_id=shift.id,
            event_id=event_id,
            amount=shift.pay_amount or 0,
            status="pending",
        )
        db.add(payout)
        created += 1

    if created > 0:
        event.status = "completed"

    booking = db.query(Booking).filter(Booking.event_id == event_id).first()
    if booking:
        invoice = Invoice(
            booking_id=booking.id,
            event_id=event_id,
            customer_id=booking.customer_id,
            amount=booking.total_amount - booking.platform_fee,
            platform_fee=booking.platform_fee,
            total=booking.total_amount,
            status="paid",
            paid_at=datetime.now(timezone.utc),
        )
        db.add(invoice)
        booking.status = "completed"

    db.commit()
    return {"message": f"Generated {created} payouts", "created": created}


# ---- Pricing Rules ----

@router.get("/pricing", response_model=list[PricingRuleResponse])
def list_pricing_rules(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    rules = db.query(PricingRule).all()
    if not rules:
        defaults = [
            PricingRule(role="server", hourly_rate=25.0, platform_fee_percent=15.0),
            PricingRule(role="bartender", hourly_rate=30.0, platform_fee_percent=15.0),
            PricingRule(role="cleaner", hourly_rate=20.0, platform_fee_percent=15.0),
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        rules = db.query(PricingRule).all()
    return [PricingRuleResponse.model_validate(r) for r in rules]


@router.put("/pricing/{role}", response_model=PricingRuleResponse)
def update_pricing_rule(
    role: str,
    data: PricingRuleUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    rule = db.query(PricingRule).filter(PricingRule.role == role).first()
    if not rule:
        rule = PricingRule(role=role, hourly_rate=25.0, platform_fee_percent=15.0)
        db.add(rule)
        db.flush()

    if data.hourly_rate is not None:
        rule.hourly_rate = data.hourly_rate
    if data.platform_fee_percent is not None:
        rule.platform_fee_percent = data.platform_fee_percent

    db.commit()
    db.refresh(rule)
    return PricingRuleResponse.model_validate(rule)
