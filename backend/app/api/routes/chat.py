from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.services.chat_service import GeminiServiceError, answer_chat_message

router = APIRouter(prefix="/chat", tags=["AquaGrow AI Assistant"])


@router.post("/message", response_model=ChatMessageResponse)
def send_chat_message(request: ChatMessageRequest, db: Session = Depends(get_db)):
    try:
        return answer_chat_message(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (TimeoutError, httpx.TimeoutException) as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="The AI assistant timed out. Please try again.") from exc
    except GeminiServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
