from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.event import Booking, Event, Notification, Payout, Shift, Tip
from app.models.schemas import TipCreate, TipResponse
from app.models.user import User

router = APIRouter(prefix="/api/tips", tags=["tips"])


@router.post("", response_model=list[TipResponse])
def create_tip(
    data: TipCreate,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your event")

    booking = db.query(Booking).filter(
        Booking.event_id == data.event_id,
        Booking.customer_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=400, detail="No booking found for this event")

    # Check if tips already exist for this event from this customer
    existing = db.query(Tip).filter(
        Tip.event_id == data.event_id,
        Tip.from_customer_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already tipped for this event")

    shifts = db.query(Shift).filter(
        Shift.event_id == data.event_id,
        Shift.status.in_(["clocked_out", "completed"]),
    ).all()

    if not shifts:
        raise HTTPException(status_code=400, detail="No completed shifts to tip")

    tips = []
    if data.split_type == "even":
        per_worker = round(data.amount / len(shifts), 2)
        for shift in shifts:
            tip = Tip(
                event_id=data.event_id,
                booking_id=booking.id,
                from_customer_id=current_user.id,
                to_worker_id=shift.worker_id,
                amount=per_worker,
                split_type="even",
            )
            db.add(tip)
            tips.append(tip)

            # Update payout tip amount
            payout = db.query(Payout).filter(Payout.shift_id == shift.id).first()
            if payout:
                payout.tip_amount = (payout.tip_amount or 0) + per_worker

            # Notify worker
            notif = Notification(
                user_id=shift.worker_id,
                title="You received a tip!",
                message=f"{current_user.full_name} tipped you ${per_worker:.2f} for '{event.name}'",
                notification_type="tip",
                reference_id=data.event_id,
            )
            db.add(notif)
    elif data.split_type == "per_worker" and data.worker_tips:
        for wt in data.worker_tips:
            worker_id = wt.get("worker_id")
            amount = wt.get("amount", 0)
            if not worker_id or amount <= 0:
                continue
            tip = Tip(
                event_id=data.event_id,
                booking_id=booking.id,
                from_customer_id=current_user.id,
                to_worker_id=worker_id,
                amount=amount,
                split_type="per_worker",
            )
            db.add(tip)
            tips.append(tip)

            payout = db.query(Payout).filter(
                Payout.event_id == data.event_id,
                Payout.worker_id == worker_id,
            ).first()
            if payout:
                payout.tip_amount = (payout.tip_amount or 0) + amount

            notif = Notification(
                user_id=worker_id,
                title="You received a tip!",
                message=f"{current_user.full_name} tipped you ${amount:.2f} for '{event.name}'",
                notification_type="tip",
                reference_id=data.event_id,
            )
            db.add(notif)

    db.commit()
    return [TipResponse.model_validate(t) for t in tips]


@router.get("/event/{event_id}", response_model=list[TipResponse])
def get_event_tips(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tips = db.query(Tip).filter(Tip.event_id == event_id).all()
    return [TipResponse.model_validate(t) for t in tips]


@router.get("/my-tips")
def get_my_tips(
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    tips = (
        db.query(Tip)
        .filter(Tip.to_worker_id == current_user.id)
        .order_by(Tip.created_at.desc())
        .all()
    )
    total_tips = sum(t.amount for t in tips)
    tip_list = []
    for t in tips:
        event = db.query(Event).filter(Event.id == t.event_id).first()
        customer = db.query(User).filter(User.id == t.from_customer_id).first()
        tip_list.append({
            "id": t.id,
            "amount": t.amount,
            "event_name": event.name if event else None,
            "from_customer": customer.full_name if customer else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return {"total_tips": total_tips, "tips": tip_list}
