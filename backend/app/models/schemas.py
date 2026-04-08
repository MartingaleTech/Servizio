from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ---- Auth Schemas ----

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str  # "customer" or "worker"
    organization_name: Optional[str] = None  # for customers


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Worker Profile Schemas ----

class WorkerProfileCreate(BaseModel):
    date_of_birth: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    roles_interested: Optional[str] = None
    experience_level: Optional[str] = "beginner"
    languages: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
    max_travel_distance_km: Optional[float] = 20.0
    skills_tags: Optional[str] = None
    certifications: Optional[str] = None


class WorkerProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    roles_interested: Optional[str] = None
    experience_level: Optional[str] = None
    languages: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
    max_travel_distance_km: Optional[float] = None
    is_accepting_jobs: Optional[bool] = None
    skills_tags: Optional[str] = None
    certifications: Optional[str] = None


class WorkerProfileResponse(BaseModel):
    id: str
    user_id: str
    date_of_birth: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    roles_interested: Optional[str] = None
    experience_level: str
    languages: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
    max_travel_distance_km: float
    is_accepting_jobs: bool
    average_rating: float
    total_reviews: int
    total_events_completed: int
    verification_status: str
    full_name: Optional[str] = None
    skills_tags: Optional[str] = None
    certifications: Optional[str] = None
    event_types_worked: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerProfileResponse(BaseModel):
    id: str
    user_id: str
    organization_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    average_rating: float
    total_reviews: int
    total_events: int
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- ID Verification Schemas ----

class IDVerificationCreate(BaseModel):
    government_id_front_url: str
    government_id_back_url: str
    selfie_url: str


class IDVerificationResponse(BaseModel):
    id: str
    user_id: str
    government_id_front_url: Optional[str] = None
    government_id_back_url: Optional[str] = None
    selfie_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IDVerificationReview(BaseModel):
    status: str  # "approved" or "rejected"
    admin_notes: Optional[str] = None


# ---- Availability Schemas ----

class AvailabilityCreate(BaseModel):
    day_of_week: Optional[int] = None
    specific_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_unavailable: bool = False


class AvailabilityResponse(BaseModel):
    id: str
    user_id: str
    day_of_week: Optional[int] = None
    specific_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_unavailable: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Event Schemas ----

class EventCreate(BaseModel):
    name: str
    event_type: str
    start_datetime: datetime
    end_datetime: datetime
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    guest_count: Optional[int] = None
    servers_needed: int = 0
    bartenders_needed: int = 0
    cleaners_needed: int = 0
    dress_code: Optional[str] = None
    special_instructions: Optional[str] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    event_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    guest_count: Optional[int] = None
    servers_needed: Optional[int] = None
    bartenders_needed: Optional[int] = None
    cleaners_needed: Optional[int] = None
    dress_code: Optional[str] = None
    special_instructions: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    event_type: str
    start_datetime: datetime
    end_datetime: datetime
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    guest_count: Optional[int] = None
    servers_needed: int
    bartenders_needed: int
    cleaners_needed: int
    dress_code: Optional[str] = None
    special_instructions: Optional[str] = None
    status: str
    created_at: datetime
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Quote Schemas ----

class QuoteResponse(BaseModel):
    id: str
    event_id: str
    customer_id: str
    servers_count: int
    servers_rate: float
    bartenders_count: int
    bartenders_rate: float
    cleaners_count: int
    cleaners_rate: float
    hours: float
    subtotal: float
    platform_fee: float
    total: float
    is_accepted: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Booking Schemas ----

class BookingCreate(BaseModel):
    event_id: str
    payment_method: Optional[str] = "card"


class BookingResponse(BaseModel):
    id: str
    event_id: str
    customer_id: str
    status: str
    total_amount: float
    platform_fee: float
    payment_status: str
    payment_method: Optional[str] = None
    created_at: datetime
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Shift Schemas ----

class ShiftResponse(BaseModel):
    id: str
    event_id: str
    booking_id: str
    worker_id: str
    role: str
    status: str
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    planned_start: Optional[datetime] = None
    planned_end: Optional[datetime] = None
    hours_worked: Optional[float] = None
    pay_amount: Optional[float] = None
    is_overtime: bool = False
    overtime_hours: float = 0.0
    overtime_approved: Optional[bool] = None
    worker_latitude: Optional[float] = None
    worker_longitude: Optional[float] = None
    eta_minutes: Optional[int] = None
    arrived_at: Optional[datetime] = None
    created_at: datetime
    event_name: Optional[str] = None
    worker_name: Optional[str] = None

    class Config:
        from_attributes = True


class ShiftAction(BaseModel):
    action: str  # "accept", "decline", "clock_in", "clock_out", "on_the_way"


# ---- Invoice Schemas ----

class InvoiceResponse(BaseModel):
    id: str
    booking_id: str
    event_id: str
    customer_id: str
    amount: float
    platform_fee: float
    total: float
    status: str
    issued_at: datetime
    paid_at: Optional[datetime] = None
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Payout Schemas ----

class PayoutResponse(BaseModel):
    id: str
    worker_id: str
    shift_id: str
    event_id: str
    amount: float
    tip_amount: float = 0.0
    status: str
    payout_method: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Rating Schemas ----

class RatingCreate(BaseModel):
    event_id: str
    to_user_id: str
    rating: int  # 1-5
    review_text: Optional[str] = None


class RatingResponse(BaseModel):
    id: str
    event_id: str
    from_user_id: str
    to_user_id: str
    rating: int
    review_text: Optional[str] = None
    rating_type: str
    created_at: datetime
    from_user_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Notification Schemas ----

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Pricing Schemas ----

class PricingRuleUpdate(BaseModel):
    hourly_rate: Optional[float] = None
    platform_fee_percent: Optional[float] = None


class PricingRuleResponse(BaseModel):
    id: str
    role: str
    hourly_rate: float
    platform_fee_percent: float

    class Config:
        from_attributes = True


# ---- Admin Schemas ----

class AdminStats(BaseModel):
    total_users: int
    total_customers: int
    total_workers: int
    total_events: int
    total_bookings: int
    pending_verifications: int
    total_revenue: float
    total_payouts: float


class WorkerAssignment(BaseModel):
    worker_id: str
    role: str


# ---- V1: Chat Schemas ----

class ChatRoomResponse(BaseModel):
    id: str
    event_id: Optional[str] = None
    room_type: str
    name: Optional[str] = None
    created_by: str
    is_active: bool
    created_at: datetime
    members: list[str] = []
    last_message: Optional[str] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    message: str
    is_quick_message: bool = False


class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    message: str
    is_quick_message: bool
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


class SupportChatCreate(BaseModel):
    subject: Optional[str] = None


# ---- V1: Tip Schemas ----

class TipCreate(BaseModel):
    event_id: str
    amount: float
    split_type: str = "even"  # "even" or "per_worker"
    worker_tips: Optional[list[dict]] = None  # [{"worker_id": "...", "amount": 10.0}]


class TipResponse(BaseModel):
    id: str
    event_id: str
    booking_id: str
    from_customer_id: str
    to_worker_id: Optional[str] = None
    amount: float
    split_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- V1: Dispute Schemas ----

class DisputeCreate(BaseModel):
    event_id: str
    booking_id: Optional[str] = None
    filed_against: Optional[str] = None
    dispute_type: str  # "cancellation", "no_show", "quality", "payment", "overtime", "other"
    description: str


class DisputeResponse(BaseModel):
    id: str
    event_id: str
    booking_id: Optional[str] = None
    filed_by: str
    filed_against: Optional[str] = None
    dispute_type: str
    description: str
    status: str
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    refund_amount: Optional[float] = None
    payout_adjustment: Optional[float] = None
    created_at: datetime
    filed_by_name: Optional[str] = None
    filed_against_name: Optional[str] = None

    class Config:
        from_attributes = True


class DisputeResolve(BaseModel):
    status: str  # "resolved", "dismissed"
    resolution: str
    refund_amount: Optional[float] = None
    payout_adjustment: Optional[float] = None


# ---- V1: Cancellation Policy Schemas ----

class CancellationPolicyResponse(BaseModel):
    id: str
    policy_type: str
    hours_before_free_cancel: int
    late_cancel_fee_percent: float
    no_show_fee_percent: float
    worker_cancel_rating_penalty: float
    worker_cancel_suspension_hours: int

    class Config:
        from_attributes = True


class CancellationPolicyUpdate(BaseModel):
    hours_before_free_cancel: Optional[int] = None
    late_cancel_fee_percent: Optional[float] = None
    no_show_fee_percent: Optional[float] = None
    worker_cancel_rating_penalty: Optional[float] = None
    worker_cancel_suspension_hours: Optional[int] = None


class ShiftLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    eta_minutes: Optional[int] = None


class OvertimeAction(BaseModel):
    action: str  # "approve", "dispute"


# Forward reference resolution
TokenResponse.model_rebuild()
