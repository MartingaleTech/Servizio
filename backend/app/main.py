from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routes import auth, workers, events, admin, notifications, ratings

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Servizio API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Register routers
app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(events.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(ratings.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.on_event("startup")
def seed_admin():
    """Create default admin user and pricing rules on startup."""
    from app.core.database import SessionLocal
    from app.core.security import get_password_hash
    from app.models.user import User
    from app.models.event import PricingRule

    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.email == "admin@servizio.com").first()
        if not existing_admin:
            admin_user = User(
                email="admin@servizio.com",
                password_hash=get_password_hash("admin123"),
                full_name="Admin",
                role="admin",
                phone="0000000000",
            )
            db.add(admin_user)

        # Seed pricing rules
        for role, rate in [("server", 25.0), ("bartender", 30.0), ("cleaner", 20.0)]:
            existing = db.query(PricingRule).filter(PricingRule.role == role).first()
            if not existing:
                db.add(PricingRule(role=role, hourly_rate=rate, platform_fee_percent=15.0))

        db.commit()
    finally:
        db.close()
