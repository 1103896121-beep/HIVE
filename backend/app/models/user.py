from sqlalchemy import Column, String, Boolean, DateTime, BigInteger, Integer, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    trial_start_at = Column(DateTime, default=datetime.utcnow)
    subscription_end_at = Column(DateTime, nullable=True)

    profile = relationship("Profile", back_populates="user", uselist=False)
    focus_sessions = relationship("FocusSession", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    name = Column(String(50), nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(String(200), nullable=True)
    theme_preference = Column(String(30), default="classic")
    daily_goal_mins = Column(Integer, default=120)
    total_focus_mins = Column(BigInteger, default=0)
    total_sparks = Column(Integer, default=0)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
