import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, Boolean
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=generate_uuid)
    customer_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)  # wedding, birthday, kids_party, funeral, corporate, other
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    guest_count = Column(Integer, nullable=True)
    servers_needed = Column(Integer, default=0)
    bartenders_needed = Column(Integer, default=0)
    cleaners_needed = Column(Integer, default=0)
    dress_code = Column(String, nullable=True)
    special_instructions = Column(Text, nullable=True)
    status = Column(String, default="draft")  # draft, pending_assignment, partially_staffed, fully_staffed, in_progress, completed, cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, nullable=False, index=True)
    customer_id = Column(String, nullable=False, index=True)
    status = Column(String, default="pending_assignment")  # pending_assignment, partially_staffed, fully_staffed, in_progress, completed, cancelled
    total_amount = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    payment_status = Column(String, default="pending")  # pending, paid, refunded
    payment_method = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, nullable=False, index=True)
    customer_id = Column(String, nullable=False, index=True)
    servers_count = Column(Integer, default=0)
    servers_rate = Column(Float, default=0.0)
    bartenders_count = Column(Integer, default=0)
    bartenders_rate = Column(Float, default=0.0)
    cleaners_count = Column(Integer, default=0)
    cleaners_rate = Column(Float, default=0.0)
    hours = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    is_accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, nullable=False, index=True)
    booking_id = Column(String, nullable=False, index=True)
    worker_id = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)  # server, bartender, cleaner
    status = Column(String, default="assigned")  # assigned, accepted, declined, on_the_way, clocked_in, clocked_out, completed, no_show
    clock_in_time = Column(DateTime, nullable=True)
    clock_out_time = Column(DateTime, nullable=True)
    planned_start = Column(DateTime, nullable=True)
    planned_end = Column(DateTime, nullable=True)
    hours_worked = Column(Float, nullable=True)
    pay_amount = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=generate_uuid)
    booking_id = Column(String, nullable=False, index=True)
    event_id = Column(String, nullable=False, index=True)
    customer_id = Column(String, nullable=False, index=True)
    amount = Column(Float, default=0.0)
    platform_fee = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending, paid, overdue, cancelled
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    paid_at = Column(DateTime, nullable=True)


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(String, primary_key=True, default=generate_uuid)
    worker_id = Column(String, nullable=False, index=True)
    shift_id = Column(String, nullable=False)
    event_id = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending, processing, paid
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, nullable=False, index=True)
    from_user_id = Column(String, nullable=False, index=True)
    to_user_id = Column(String, nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    review_text = Column(Text, nullable=True)
    rating_type = Column(String, nullable=False)  # customer_to_worker, worker_to_customer
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=False)  # job_available, job_accepted, booking_confirmed, shift_reminder, payment, rating
    reference_id = Column(String, nullable=True)  # event_id, shift_id, etc.
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(String, primary_key=True, default=generate_uuid)
    role = Column(String, nullable=False, unique=True)  # server, bartender, cleaner
    hourly_rate = Column(Float, nullable=False)
    platform_fee_percent = Column(Float, default=15.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
