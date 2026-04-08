import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.schemas import (
    OTPRequest,
    OTPVerify,
    TokenResponse,
    UserLogin,
    UserResponse,
    UserSignup,
)
from app.models.user import CustomerProfile, OTPCode, User, WorkerProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.phone:
        existing_phone = db.query(User).filter(User.phone == data.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone already registered")

    if data.role not in ("customer", "worker"):
        raise HTTPException(status_code=400, detail="Role must be 'customer' or 'worker'")

    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    db.flush()

    if data.role == "worker":
        profile = WorkerProfile(user_id=user.id)
        db.add(profile)
    else:
        profile = CustomerProfile(
            user_id=user.id,
            organization_name=data.organization_name,
        )
        db.add(profile)

    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/otp/request")
def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    code = str(random.randint(100000, 999999))
    otp = OTPCode(
        phone=data.phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    db.add(otp)
    db.commit()
    # In production, send SMS here
    return {"message": "OTP sent successfully", "code": code}  # Remove code in production


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.phone == data.phone,
            OTPCode.code == data.code,
            OTPCode.is_used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        )
        .order_by(OTPCode.created_at.desc())
        .first()
    )
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    otp.is_used = True
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this phone number")

    db.commit()
    token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
