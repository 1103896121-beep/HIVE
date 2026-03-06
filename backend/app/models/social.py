from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, BigInteger, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Squad(Base):
    __tablename__ = "squads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    invite_code = Column(String(10), unique=True, index=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_private = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("SquadMember", back_populates="squad")
    sessions = relationship("FocusSession", back_populates="squad")

class SquadMember(Base):
    __tablename__ = "squad_members"

    squad_id = Column(UUID(as_uuid=True), ForeignKey("squads.id"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role = Column(String(20), default="MEMBER")
    joined_at = Column(DateTime, default=datetime.utcnow)

    squad = relationship("Squad", back_populates="members")

class Bond(Base):
    __tablename__ = "bonds"

    user_id_1 = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    user_id_2 = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    status = Column(String(20), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)

class Nudge(Base):
    __tablename__ = "nudges"

    id = Column(BigInteger, primary_key=True, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    nudge_type = Column(String(20), default="VIBRATE")
    created_at = Column(DateTime, default=datetime.utcnow)
