import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Float, Text, Integer
from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "customer", "worker", "admin"
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, unique=True, index=True)
    date_of_birth = Column(String, nullable=True)
    city = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    profile_photo_url = Column(String, nullable=True)
    roles_interested = Column(String, nullable=True)  # comma-separated: "server,bartender,cleaner"
    experience_level = Column(String, default="beginner")  # beginner, intermediate, experienced
    languages = Column(String, nullable=True)  # comma-separated
    home_latitude = Column(Float, nullable=True)
    home_longitude = Column(Float, nullable=True)
    max_travel_distance_km = Column(Float, default=20.0)
    is_accepting_jobs = Column(Boolean, default=True)
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    total_events_completed = Column(Integer, default=0)
    verification_status = Column(String, default="unverified")  # unverified, pending, approved, rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, unique=True, index=True)
    organization_name = Column(String, nullable=True)
    profile_photo_url = Column(String, nullable=True)
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class IDVerification(Base):
    __tablename__ = "id_verifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, index=True)
    government_id_front_url = Column(String, nullable=True)
    government_id_back_url = Column(String, nullable=True)
    selfie_url = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class WorkerAvailability(Base):
    __tablename__ = "worker_availabilities"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, index=True)
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 6=Sunday (for recurring)
    specific_date = Column(String, nullable=True)  # YYYY-MM-DD (for specific dates)
    start_time = Column(String, nullable=True)  # HH:MM
    end_time = Column(String, nullable=True)  # HH:MM
    is_unavailable = Column(Boolean, default=False)  # True means blocked/unavailable
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
