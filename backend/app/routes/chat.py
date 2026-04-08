from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.event import ChatMessage, ChatRoom, ChatRoomMember, Event, Shift, Notification
from app.models.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatRoomResponse,
    SupportChatCreate,
)
from app.models.user import User

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_room_response(db: Session, room: ChatRoom, user_id: str) -> ChatRoomResponse:
    members = db.query(ChatRoomMember).filter(ChatRoomMember.room_id == room.id).all()
    member_ids = [m.user_id for m in members]
    member_names = []
    for mid in member_ids:
        u = db.query(User).filter(User.id == mid).first()
        if u:
            member_names.append(u.full_name)

    last_msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room.id)
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    unread = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.room_id == room.id,
            ChatMessage.sender_id != user_id,
            ChatMessage.is_read == False,
        )
        .count()
    )

    resp = ChatRoomResponse.model_validate(room)
    resp.members = member_names
    resp.last_message = last_msg.message if last_msg else None
    resp.unread_count = unread
    return resp


@router.get("/rooms", response_model=list[ChatRoomResponse])
def list_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(ChatRoomMember).filter(ChatRoomMember.user_id == current_user.id).all()
    room_ids = [m.room_id for m in memberships]
    rooms = db.query(ChatRoom).filter(ChatRoom.id.in_(room_ids), ChatRoom.is_active == True).all()
    return [_build_room_response(db, r, current_user.id) for r in rooms]


@router.get("/rooms/{room_id}", response_model=ChatRoomResponse)
def get_chat_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room_id,
        ChatRoomMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat room")

    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return _build_room_response(db, room, current_user.id)


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
def get_messages(
    room_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room_id,
        ChatRoomMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat room")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )

    # Mark messages as read
    db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.sender_id != current_user.id,
        ChatMessage.is_read == False,
    ).update({"is_read": True})
    db.commit()

    results = []
    for msg in reversed(messages):
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        resp = ChatMessageResponse.model_validate(msg)
        resp.sender_name = sender.full_name if sender else None
        results.append(resp)
    return results


@router.post("/rooms/{room_id}/messages", response_model=ChatMessageResponse)
def send_message(
    room_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room_id,
        ChatRoomMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat room")

    msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        message=data.message,
        is_quick_message=data.is_quick_message,
    )
    db.add(msg)

    # Notify other members
    other_members = db.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room_id,
        ChatRoomMember.user_id != current_user.id,
    ).all()
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    for m in other_members:
        notif = Notification(
            user_id=m.user_id,
            title="New Message",
            message=f"{current_user.full_name}: {data.message[:100]}",
            notification_type="chat",
            reference_id=room_id,
        )
        db.add(notif)

    db.commit()
    db.refresh(msg)

    resp = ChatMessageResponse.model_validate(msg)
    resp.sender_name = current_user.full_name
    return resp


@router.post("/support", response_model=ChatRoomResponse)
def create_support_chat(
    data: SupportChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check for existing active support chat
    existing_memberships = db.query(ChatRoomMember).filter(
        ChatRoomMember.user_id == current_user.id
    ).all()
    for mem in existing_memberships:
        room = db.query(ChatRoom).filter(
            ChatRoom.id == mem.room_id,
            ChatRoom.room_type == "support",
            ChatRoom.is_active == True,
        ).first()
        if room:
            return _build_room_response(db, room, current_user.id)

    # Create new support chat
    room = ChatRoom(
        room_type="support",
        name=data.subject or f"Support - {current_user.full_name}",
        created_by=current_user.id,
    )
    db.add(room)
    db.flush()

    # Add user and admin(s) to room
    db.add(ChatRoomMember(room_id=room.id, user_id=current_user.id))
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        db.add(ChatRoomMember(room_id=room.id, user_id=admin.id))

    db.commit()
    db.refresh(room)
    return _build_room_response(db, room, current_user.id)


@router.get("/event/{event_id}", response_model=Optional[ChatRoomResponse])
def get_event_chat(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = db.query(ChatRoom).filter(
        ChatRoom.event_id == event_id,
        ChatRoom.room_type == "event",
        ChatRoom.is_active == True,
    ).first()
    if not room:
        return None

    member = db.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room.id,
        ChatRoomMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this event chat")

    return _build_room_response(db, room, current_user.id)
