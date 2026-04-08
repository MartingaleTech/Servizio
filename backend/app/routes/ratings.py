from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import Event, Rating, Shift
from app.models.schemas import RatingCreate, RatingResponse
from app.models.user import CustomerProfile, User, WorkerProfile

router = APIRouter(prefix="/api/ratings", tags=["ratings"])


@router.post("", response_model=RatingResponse)
def create_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = db.query(Rating).filter(
        Rating.event_id == data.event_id,
        Rating.from_user_id == current_user.id,
        Rating.to_user_id == data.to_user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already rated this user for this event")

    if current_user.role == "customer":
        rating_type = "customer_to_worker"
        shift = db.query(Shift).filter(
            Shift.event_id == data.event_id,
            Shift.worker_id == data.to_user_id,
        ).first()
        if not shift:
            raise HTTPException(status_code=400, detail="This worker was not assigned to your event")
    else:
        rating_type = "worker_to_customer"
        if event.customer_id != data.to_user_id:
            raise HTTPException(status_code=400, detail="Can only rate the event host")

    rating = Rating(
        event_id=data.event_id,
        from_user_id=current_user.id,
        to_user_id=data.to_user_id,
        rating=data.rating,
        review_text=data.review_text,
        rating_type=rating_type,
    )
    db.add(rating)
    db.flush()

    # Update average rating
    all_ratings = db.query(Rating).filter(Rating.to_user_id == data.to_user_id).all()
    avg = sum(r.rating for r in all_ratings) / len(all_ratings)

    target_user = db.query(User).filter(User.id == data.to_user_id).first()
    if target_user and target_user.role == "worker":
        profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == data.to_user_id).first()
        if profile:
            profile.average_rating = round(avg, 2)
            profile.total_reviews = len(all_ratings)
    elif target_user and target_user.role == "customer":
        profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == data.to_user_id).first()
        if profile:
            profile.average_rating = round(avg, 2)
            profile.total_reviews = len(all_ratings)

    db.commit()
    db.refresh(rating)
    resp = RatingResponse.model_validate(rating)
    resp.from_user_name = current_user.full_name
    return resp


@router.get("/user/{user_id}", response_model=list[RatingResponse])
def get_user_ratings(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ratings = (
        db.query(Rating)
        .filter(Rating.to_user_id == user_id)
        .order_by(Rating.created_at.desc())
        .all()
    )
    results = []
    for r in ratings:
        from_user = db.query(User).filter(User.id == r.from_user_id).first()
        resp = RatingResponse.model_validate(r)
        resp.from_user_name = from_user.full_name if from_user else None
        results.append(resp)
    return results


@router.get("/event/{event_id}", response_model=list[RatingResponse])
def get_event_ratings(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ratings = (
        db.query(Rating)
        .filter(Rating.event_id == event_id)
        .order_by(Rating.created_at.desc())
        .all()
    )
    results = []
    for r in ratings:
        from_user = db.query(User).filter(User.id == r.from_user_id).first()
        resp = RatingResponse.model_validate(r)
        resp.from_user_name = from_user.full_name if from_user else None
        results.append(resp)
    return results
