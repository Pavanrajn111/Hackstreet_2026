import json
import logging
import re
import uuid
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.farm import FarmModel
from app.schemas.adaptive_irrigation import IrrigationOptionsRequest
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.schemas.hybrid import HybridRecommendRequest
from app.schemas.recommendation import RecommendRequest
from app.schemas.water_resilience import WaterShortageActionPlanRequest
from app.services.adaptive_irrigation_service import evaluate_irrigation_options
from app.services.crop_planner_service import get_commodity_price_forecast
from app.services.hybrid_service import get_hybrid_crop_recommendations
from app.services.irrigation_engine import calculate_irrigation_recommendation
from app.services.water_resilience_service import generate_water_shortage_action_plan
from app.services.weather_service import fetch_weather_data

logger = logging.getLogger(__name__)


class GeminiServiceError(RuntimeError):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


def _jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    return value


def _farm_context(farm: FarmModel) -> Dict[str, Any]:
    return {
        "id": farm.id,
        "farm_name": farm.farm_name,
        "crop": farm.crop,
        "soil_type": farm.soil_type,
        "farm_area_hectares": farm.farm_area_hectares,
        "latitude": farm.latitude,
        "longitude": farm.longitude,
        "sowing_date": farm.sowing_date.isoformat() if farm.sowing_date else None,
        "irrigation_method": farm.irrigation_method,
        "last_irrigation_date": farm.last_irrigation_date.isoformat() if farm.last_irrigation_date else None,
        "pump_flow_rate_lpm": farm.pump_flow_rate_lpm,
    }


def _find_farm(db: Session, farm_id: Optional[int]) -> Optional[FarmModel]:
    if farm_id is None:
        return None
    return db.query(FarmModel).filter(FarmModel.id == farm_id).first()


def _needs_farm(tool_names: List[str]) -> bool:
    return any(name not in {"get_market_forecast"} for name in tool_names)


def _detect_tools(message: str) -> List[str]:
    lowered = message.lower()
    tools = []
    if re.search(r"\b(irrigat|water today|water requirement)\w*", lowered):
        tools.append("get_irrigation_recommendation")
    if re.search(r"\b(weather|rain|temperature|forecast)\w*", lowered):
        tools.append("get_weather_information")
    if re.search(r"\b(market|price|sell|commodity)\w*", lowered):
        tools.append("get_market_forecast")
    if re.search(r"\b(hybrid|intercrop|inter-crop|layout|crops?|grow|plant|suitable)\w*", lowered):
        tools.append("get_hybrid_recommendations")
    if re.search(r"\b(adaptive|drip|sprinkler|irrigation method|water saving)\w*", lowered):
        tools.append("get_adaptive_irrigation_options")
    if re.search(r"\b(shortage|resilien|scarce water|water deficit)\w*", lowered):
        tools.append("get_water_resilience_plan")
    if re.search(r"\b(details|profile|my farm|farm information)\w*", lowered):
        tools.append("get_farm_details")
    return list(dict.fromkeys(tools))


def _run_tools(db: Session, request: ChatMessageRequest, farm: Optional[FarmModel], tool_names: List[str]) -> Tuple[List[Dict[str, Any]], List[str]]:
    if _needs_farm(tool_names) and farm is None:
        return [], ["A registered farm must be selected for this question. Please select a farm and try again."]

    results: List[Dict[str, Any]] = []
    sources: List[str] = []
    for tool_name in tool_names:
        try:
            if tool_name == "get_farm_details":
                results.append({"tool": tool_name, "result": _farm_context(farm)})
                sources.append("AquaGrow registered farm profile")
            elif tool_name == "get_irrigation_recommendation":
                payload = RecommendRequest(
                    farm_id=farm.id,
                    farm_name=farm.farm_name,
                    latitude=farm.latitude,
                    longitude=farm.longitude,
                    crop=farm.crop,
                    soil_type=farm.soil_type,
                    sowing_date=farm.sowing_date,
                    farm_area_hectares=farm.farm_area_hectares,
                    irrigation_method=farm.irrigation_method,
                    last_irrigation_date=farm.last_irrigation_date,
                    pump_flow_rate_lpm=farm.pump_flow_rate_lpm,
                )
                results.append({"tool": tool_name, "result": _jsonable(calculate_irrigation_recommendation(payload))})
                sources.append("AquaGrow FAO-56 irrigation engine")
            elif tool_name == "get_weather_information":
                results.append({"tool": tool_name, "result": _jsonable(fetch_weather_data(farm.latitude, farm.longitude))})
                sources.append("Open-Meteo weather service")
            elif tool_name == "get_market_forecast":
                commodity = next((name for name in ("coconut", "pepper", "papaya", "banana", "turmeric", "arecanut", "drumstick", "marigold") if name in request.message.lower()), None)
                if not commodity:
                    results.append({"tool": tool_name, "result": {"needs_input": "commodity"}})
                else:
                    results.append({"tool": tool_name, "result": _jsonable(get_commodity_price_forecast(commodity))})
                    sources.append("AquaGrow market forecast model")
            elif tool_name == "get_hybrid_recommendations":
                payload = HybridRecommendRequest(
                    farm_id=farm.id,
                    main_crop=farm.crop,
                    farm_area_hectares=farm.farm_area_hectares,
                    soil_type=farm.soil_type,
                    irrigation_method=farm.irrigation_method,
                )
                results.append({"tool": tool_name, "result": _jsonable(get_hybrid_crop_recommendations(payload))})
                sources.append("AquaGrow hybrid farming engine")
            elif tool_name == "get_adaptive_irrigation_options":
                payload = IrrigationOptionsRequest(
                    farm_id=farm.id,
                    crop=farm.crop,
                    soil_type=farm.soil_type,
                    farm_area_hectares=farm.farm_area_hectares,
                    existing_irrigation_method=farm.irrigation_method,
                )
                results.append({"tool": tool_name, "result": _jsonable(evaluate_irrigation_options(payload, db))})
                sources.append("AquaGrow adaptive irrigation advisor")
            elif tool_name == "get_water_resilience_plan":
                payload = WaterShortageActionPlanRequest(
                    farm_id=farm.id,
                    crop=farm.crop,
                    soil_type=farm.soil_type,
                    farm_area_hectares=farm.farm_area_hectares,
                    latitude=farm.latitude,
                    longitude=farm.longitude,
                    existing_irrigation_method=farm.irrigation_method,
                )
                results.append({"tool": tool_name, "result": _jsonable(generate_water_shortage_action_plan(payload, db))})
                sources.append("AquaGrow water resilience planner")
        except Exception as exc:
            logger.warning("Chat tool %s failed: %s", tool_name, exc)
            results.append({"tool": tool_name, "error": "The requested AquaGrow service was unavailable."})
    return results, sources


def _history_for_gemini(history: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    contents = []
    for item in history[-20:]:
        role = "model" if item.get("role") == "assistant" else "user"
        text = str(item.get("content", "")).strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text[:4000]}]})
    return contents


def _extract_text(payload: Dict[str, Any]) -> Tuple[str, Optional[str]]:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("Gemini response did not contain a candidate.")
    candidate = candidates[0]
    parts = candidate.get("content", {}).get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()
    return text, candidate.get("finishReason")


def _call_gemini(request: ChatMessageRequest, tool_results: List[Dict[str, Any]]) -> Tuple[str, Optional[str]]:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_"):
        raise GeminiServiceError("Gemini API configuration is missing on the backend.", 503)
    context = json.dumps(tool_results, ensure_ascii=False, default=str)
    payload = {
        "system_instruction": {"parts": [{"text": (
            "You are AquaGrow AI, a farmer-friendly agricultural assistant. "
            "Use the supplied AquaGrow tool results as the source of truth for live farm, weather, irrigation, market, and planning data. "
            "Never invent quantities, prices, forecasts, or scores. Explain uncertainty and missing data plainly. "
            "Use a clear Markdown structure with a short summary, headings, bullet lists, and numbered next steps when useful. "
            "For crop recommendations, cover recommended crops, why they suit the farm, soil and climate considerations, water requirements, benefits, limitations, and next steps. "
            "Only use values present in the AquaGrow tool results. Label general agricultural guidance as general guidance. "
            "Never invent yields, profits, market prices, or suitability scores. "
            "Do not claim an action happened unless the tool result proves it."
        )}]},
        "contents": _history_for_gemini(request.history) + [{"role": "user", "parts": [{"text": request.message}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": settings.GEMINI_MAX_OUTPUT_TOKENS},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    try:
        with httpx.Client(timeout=settings.GEMINI_API_TIMEOUT_SECONDS) as client:
            response = client.post(url, params={"key": settings.GEMINI_API_KEY}, json={**payload, "contents": payload["contents"][:-1] + [{"role": "user", "parts": [{"text": f"{request.message}\n\nAquaGrow tool results (authoritative):\n{context}"}]}]})
    except httpx.TimeoutException as exc:
        logger.warning("Gemini request exceeded the configured timeout of %ss", settings.GEMINI_API_TIMEOUT_SECONDS)
        raise TimeoutError("Gemini did not respond within the configured timeout.") from exc
    except httpx.RequestError as exc:
        logger.warning("Gemini request failed: %s", exc)
        raise GeminiServiceError("The AI assistant could not reach Gemini. Please try again.", 503) from exc
    provider_error = {}
    try:
        provider_error = response.json().get("error", {})
    except (ValueError, TypeError):
        provider_error = {}
    provider_status = provider_error.get("status", "unknown")
    provider_message = str(provider_error.get("message", ""))[:240]
    if response.status_code in {401, 403}:
        logger.error("Gemini rejected credentials: HTTP %s provider_status=%s message=%s", response.status_code, provider_status, provider_message)
        raise GeminiServiceError("Gemini authentication failed. Check the backend API key and permissions.", 502)
    if response.status_code == 400:
        logger.warning("Gemini rejected the request: HTTP 400 provider_status=%s message=%s", provider_status, provider_message)
        raise GeminiServiceError("Gemini rejected the chat request. Please try a shorter or clearer question.", 502)
    if response.status_code == 404:
        logger.error("Configured Gemini model %s was not found: provider_status=%s message=%s", settings.GEMINI_MODEL, provider_status, provider_message)
        raise GeminiServiceError("The configured Gemini model is unavailable. Check GEMINI_MODEL.", 502)
    if response.status_code == 429:
        logger.warning("Gemini quota or rate limit reached: provider_status=%s message=%s", provider_status, provider_message)
        raise GeminiServiceError("Gemini quota or rate limit exceeded. Please try again later.", 429)
    if response.status_code >= 500:
        logger.warning("Gemini returned server error: HTTP %s provider_status=%s message=%s", response.status_code, provider_status, provider_message)
        raise GeminiServiceError("Gemini is temporarily unavailable. Please try again shortly.", 503)
    if response.status_code >= 400:
        logger.warning("Gemini returned HTTP %s provider_status=%s message=%s", response.status_code, provider_status, provider_message)
        raise GeminiServiceError("The AI assistant request could not be completed.", 502)
    try:
        text, finish_reason = _extract_text(response.json())
    except (TypeError, ValueError, KeyError, IndexError) as exc:
        logger.warning("Gemini returned an invalid response payload")
        raise GeminiServiceError("Gemini returned an invalid response.", 502) from exc
    if not text:
        raise GeminiServiceError("Gemini returned an empty response.", 502)
    return text, finish_reason


def answer_chat_message(db: Session, request: ChatMessageRequest) -> ChatMessageResponse:
    conversation_id = request.conversation_id or str(uuid.uuid4())
    farm = _find_farm(db, request.farm_id)
    if request.farm_id is not None and farm is None:
        raise ValueError("The selected farm was not found.")
    tool_names = _detect_tools(request.message)
    tool_results, sources = _run_tools(db, request, farm, tool_names)
    if tool_results and any("needs_input" in item.get("result", {}) for item in tool_results):
        message = "Which commodity would you like me to check? For example: coconut, pepper, papaya, banana, turmeric, or arecanut."
    elif _needs_farm(tool_names) and farm is None:
        message = "Please select one of your registered farms first so I can use its actual AquaGrow data."
    else:
        message, finish_reason = _call_gemini(request, tool_results)
    return ChatMessageResponse(
        conversation_id=conversation_id,
        message=message,
        tool_calls=[{"name": name, "status": "completed"} for name in tool_names],
        sources=sources,
        model=settings.GEMINI_MODEL,
        finish_reason=finish_reason if "finish_reason" in locals() else None,
    )
