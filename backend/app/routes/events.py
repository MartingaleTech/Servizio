from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.event import Booking, ChatRoom, ChatRoomMember, Event, Invoice, Quote, Shift, PricingRule, Payout, Notification
from app.models.schemas import (
    BookingCreate,
    BookingResponse,
    EventCreate,
    EventResponse,
    EventUpdate,
    InvoiceResponse,
    OvertimeAction,
    QuoteResponse,
    ShiftLocationUpdate,
    ShiftResponse,
)
from app.models.user import User, WorkerProfile

router = APIRouter(prefix="/api/events", tags=["events"])


def _get_pricing(db: Session) -> dict:
    rules = db.query(PricingRule).all()
    pricing = {}
    for r in rules:
        pricing[r.role] = {"hourly_rate": r.hourly_rate, "platform_fee_percent": r.platform_fee_percent}
    defaults = {
        "server": {"hourly_rate": 25.0, "platform_fee_percent": 15.0},
        "bartender": {"hourly_rate": 30.0, "platform_fee_percent": 15.0},
        "cleaner": {"hourly_rate": 20.0, "platform_fee_percent": 15.0},
    }
    for role, default in defaults.items():
        if role not in pricing:
            pricing[role] = default
    return pricing


@router.post("", response_model=EventResponse)
def create_event(
    data: EventCreate,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = Event(
        customer_id=current_user.id,
        name=data.name,
        event_type=data.event_type,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        guest_count=data.guest_count,
        servers_needed=data.servers_needed,
        bartenders_needed=data.bartenders_needed,
        cleaners_needed=data.cleaners_needed,
        dress_code=data.dress_code,
        special_instructions=data.special_instructions,
        status="draft",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    resp = EventResponse.model_validate(event)
    resp.customer_name = current_user.full_name
    return resp


@router.get("", response_model=list[EventResponse])
def list_my_events(
    status: Optional[str] = None,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    query = db.query(Event).filter(Event.customer_id == current_user.id)
    if status:
        query = query.filter(Event.status == status)
    events = query.order_by(Event.created_at.desc()).all()
    results = []
    for e in events:
        resp = EventResponse.model_validate(e)
        resp.customer_name = current_user.full_name
        results.append(resp)
    return results


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role == "customer" and event.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    customer = db.query(User).filter(User.id == event.customer_id).first()
    resp = EventResponse.model_validate(event)
    resp.customer_name = customer.full_name if customer else None
    return resp


@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    data: EventUpdate,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status not in ("draft", "pending_assignment"):
        raise HTTPException(status_code=400, detail="Cannot edit event in current status")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    resp = EventResponse.model_validate(event)
    resp.customer_name = current_user.full_name
    return resp


@router.delete("/{event_id}")
def cancel_event(
    event_id: str,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = "cancelled"
    db.commit()
    return {"message": "Event cancelled"}


# ---- Quotes ----

@router.get("/{event_id}/quote", response_model=QuoteResponse)
def get_quote(
    event_id: str,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    pricing = _get_pricing(db)
    hours = max((event.end_datetime - event.start_datetime).total_seconds() / 3600, 1)

    server_cost = event.servers_needed * hours * pricing["server"]["hourly_rate"]
    bartender_cost = event.bartenders_needed * hours * pricing["bartender"]["hourly_rate"]
    cleaner_cost = event.cleaners_needed * hours * pricing["cleaner"]["hourly_rate"]
    subtotal = server_cost + bartender_cost + cleaner_cost
    avg_fee_pct = pricing["server"]["platform_fee_percent"]
    platform_fee = round(subtotal * avg_fee_pct / 100, 2)
    total = round(subtotal + platform_fee, 2)

    existing_quote = db.query(Quote).filter(Quote.event_id == event_id, Quote.is_accepted == False).first()
    if existing_quote:
        existing_quote.servers_count = event.servers_needed
        existing_quote.servers_rate = pricing["server"]["hourly_rate"]
        existing_quote.bartenders_count = event.bartenders_needed
        existing_quote.bartenders_rate = pricing["bartender"]["hourly_rate"]
        existing_quote.cleaners_count = event.cleaners_needed
        existing_quote.cleaners_rate = pricing["cleaner"]["hourly_rate"]
        existing_quote.hours = round(hours, 2)
        existing_quote.subtotal = round(subtotal, 2)
        existing_quote.platform_fee = platform_fee
        existing_quote.total = total
        db.commit()
        db.refresh(existing_quote)
        return QuoteResponse.model_validate(existing_quote)

    quote = Quote(
        event_id=event_id,
        customer_id=current_user.id,
        servers_count=event.servers_needed,
        servers_rate=pricing["server"]["hourly_rate"],
        bartenders_count=event.bartenders_needed,
        bartenders_rate=pricing["bartender"]["hourly_rate"],
        cleaners_count=event.cleaners_needed,
        cleaners_rate=pricing["cleaner"]["hourly_rate"],
        hours=round(hours, 2),
        subtotal=round(subtotal, 2),
        platform_fee=platform_fee,
        total=total,
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return QuoteResponse.model_validate(quote)


# ---- Bookings ----

@router.post("/{event_id}/book", response_model=BookingResponse)
def create_booking(
    event_id: str,
    data: BookingCreate,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status not in ("draft", "pending_assignment"):
        raise HTTPException(status_code=400, detail="Event cannot be booked in current status")

    existing_booking = db.query(Booking).filter(
        Booking.event_id == event_id,
        Booking.status.notin_(["cancelled"]),
    ).first()
    if existing_booking:
        raise HTTPException(status_code=400, detail="Event already has an active booking")

    quote = db.query(Quote).filter(Quote.event_id == event_id).order_by(Quote.created_at.desc()).first()
    if not quote:
        raise HTTPException(status_code=400, detail="Please generate a quote first")

    quote.is_accepted = True

    booking = Booking(
        event_id=event_id,
        customer_id=current_user.id,
        total_amount=quote.total,
        platform_fee=quote.platform_fee,
        payment_method=data.payment_method,
        payment_status="paid",
        status="pending_assignment",
    )
    db.add(booking)
    event.status = "pending_assignment"

    db.flush()

    # Auto-match workers
    _match_workers(db, event, booking)

    db.commit()
    db.refresh(booking)

    resp = BookingResponse.model_validate(booking)
    resp.event_name = event.name
    return resp


def _match_workers(db: Session, event: Event, booking: Booking):
    pricing = _get_pricing(db)
    hours = max((event.end_datetime - event.start_datetime).total_seconds() / 3600, 1)

    role_needs = []
    if event.servers_needed > 0:
        role_needs.append(("server", event.servers_needed))
    if event.bartenders_needed > 0:
        role_needs.append(("bartender", event.bartenders_needed))
    if event.cleaners_needed > 0:
        role_needs.append(("cleaner", event.cleaners_needed))

    total_assigned = 0
    total_needed = sum(count for _, count in role_needs)

    for role, count_needed in role_needs:
        eligible = (
            db.query(WorkerProfile)
            .filter(
                WorkerProfile.verification_status == "approved",
                WorkerProfile.is_accepting_jobs == True,
                WorkerProfile.roles_interested.contains(role),
            )
            .all()
        )

        assigned_for_role = 0
        rate = pricing.get(role, {}).get("hourly_rate", 25.0)

        for worker in eligible:
            if assigned_for_role >= count_needed:
                break

            existing_shift = (
                db.query(Shift)
                .filter(
                    Shift.event_id == event.id,
                    Shift.worker_id == worker.user_id,
                )
                .first()
            )
            if existing_shift:
                continue

            shift = Shift(
                event_id=event.id,
                booking_id=booking.id,
                worker_id=worker.user_id,
                role=role,
                status="assigned",
                planned_start=event.start_datetime,
                planned_end=event.end_datetime,
                pay_amount=round(rate * hours, 2),
            )
            db.add(shift)
            assigned_for_role += 1
            total_assigned += 1

            notification = Notification(
                user_id=worker.user_id,
                title="New Job Available",
                message=f"New event '{event.name}' needs a {role}. Pay: ${round(rate * hours, 2)}",
                notification_type="job_available",
                reference_id=event.id,
            )
            db.add(notification)

    if total_assigned >= total_needed:
        event.status = "fully_staffed"
        booking.status = "fully_staffed"
    elif total_assigned > 0:
        event.status = "partially_staffed"
        booking.status = "partially_staffed"

    # V1: Create event chat room when workers are assigned
    if total_assigned > 0:
        existing_room = db.query(ChatRoom).filter(
            ChatRoom.event_id == event.id,
            ChatRoom.room_type == "event",
        ).first()
        if not existing_room:
            room = ChatRoom(
                event_id=event.id,
                room_type="event",
                name=f"Event: {event.name}",
                created_by=event.customer_id,
            )
            db.add(room)
            db.flush()
            # Add customer
            db.add(ChatRoomMember(room_id=room.id, user_id=event.customer_id))
            # Add assigned workers
            assigned_shifts = db.query(Shift).filter(Shift.event_id == event.id).all()
            added_workers = set()
            for s in assigned_shifts:
                if s.worker_id not in added_workers:
                    db.add(ChatRoomMember(room_id=room.id, user_id=s.worker_id))
                    added_workers.add(s.worker_id)


@router.get("/{event_id}/booking", response_model=Optional[BookingResponse])
def get_event_booking(
    event_id: str,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    booking = (
        db.query(Booking)
        .filter(Booking.event_id == event_id, Booking.customer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .first()
    )
    if not booking:
        return None
    event = db.query(Event).filter(Event.id == event_id).first()
    resp = BookingResponse.model_validate(booking)
    resp.event_name = event.name if event else None
    return resp


@router.get("/{event_id}/shifts", response_model=list[ShiftResponse])
def get_event_shifts(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if current_user.role == "customer" and event.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    shifts = db.query(Shift).filter(Shift.event_id == event_id).all()
    results = []
    for s in shifts:
        worker = db.query(User).filter(User.id == s.worker_id).first()
        resp = ShiftResponse.model_validate(s)
        resp.event_name = event.name
        resp.worker_name = worker.full_name if worker else None
        results.append(resp)
    return results


@router.get("/{event_id}/invoice", response_model=Optional[InvoiceResponse])
def get_event_invoice(
    event_id: str,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.event_id == event_id, Invoice.customer_id == current_user.id)
        .first()
    )
    if not invoice:
        return None
    event = db.query(Event).filter(Event.id == event_id).first()
    resp = InvoiceResponse.model_validate(invoice)
    resp.event_name = event.name if event else None
    return resp


# ---- V1: GPS Location Update ----

@router.put("/{event_id}/shifts/{shift_id}/location", response_model=ShiftResponse)
def update_shift_location(
    event_id: str,
    shift_id: str,
    data: ShiftLocationUpdate,
    current_user: User = Depends(require_role(["worker"])),
    db: Session = Depends(get_db),
):
    shift = db.query(Shift).filter(
        Shift.id == shift_id,
        Shift.event_id == event_id,
        Shift.worker_id == current_user.id,
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    shift.worker_latitude = data.latitude
    shift.worker_longitude = data.longitude
    if data.eta_minutes is not None:
        shift.eta_minutes = data.eta_minutes

    db.commit()
    db.refresh(shift)

    event = db.query(Event).filter(Event.id == event_id).first()
    resp = ShiftResponse.model_validate(shift)
    resp.event_name = event.name if event else None
    resp.worker_name = current_user.full_name
    return resp


# ---- V1: Overtime Approval ----

@router.put("/{event_id}/shifts/{shift_id}/overtime", response_model=ShiftResponse)
def handle_overtime(
    event_id: str,
    shift_id: str,
    data: OvertimeAction,
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.customer_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.event_id == event_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if not shift.is_overtime:
        raise HTTPException(status_code=400, detail="This shift has no overtime")

    if data.action == "approve":
        shift.overtime_approved = True
    elif data.action == "dispute":
        shift.overtime_approved = False
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'dispute'")

    worker = db.query(User).filter(User.id == shift.worker_id).first()
    notif = Notification(
        user_id=shift.worker_id,
        title="Overtime Update",
        message=f"Your overtime for '{event.name}' has been {'approved' if shift.overtime_approved else 'disputed'}.",
        notification_type="shift",
        reference_id=shift.id,
    )
    db.add(notif)

    db.commit()
    db.refresh(shift)

    resp = ShiftResponse.model_validate(shift)
    resp.event_name = event.name
    resp.worker_name = worker.full_name if worker else None
    return resp


# ---- V1: Customer bookings list ----

@router.get("/bookings", response_model=list[BookingResponse])
def list_my_bookings(
    current_user: User = Depends(require_role(["customer"])),
    db: Session = Depends(get_db),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.customer_id == current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    results = []
    for b in bookings:
        event = db.query(Event).filter(Event.id == b.event_id).first()
        resp = BookingResponse.model_validate(b)
        resp.event_name = event.name if event else None
        results.append(resp)
    return results
