from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    conversation_id: Optional[str] = Field(default=None, max_length=100)
    message: str = Field(..., min_length=1, max_length=4000)
    farm_id: Optional[int] = Field(default=None, ge=1)
    history: List[Dict[str, str]] = Field(default_factory=list, max_length=20)


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    model: str
    finish_reason: Optional[str] = None
