"""Day 21 AI Content Moderation Guardrail.

Validates and moderates user-generated inputs and product prompts before sending
them to external LLMs, vector search, or Redis cache.
Note: Uses a deterministic rule-and-pattern guardrail (not an external paid moderation API)
so moderation works offline, deterministically, and with zero latency or secret leakage.
"""

from __future__ import annotations

import logging
import re
from typing import Any
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


class ModerationResult(BaseModel):
    """Structured result returned by the content moderation engine."""

    allowed: bool = Field(..., description="Whether the input passed safety moderation")
    flagged_categories: list[str] = Field(
        default_factory=list,
        description="List of policy categories triggered if rejected",
    )
    reason: str | None = Field(
        default=None,
        description="Human-readable explanation when content is rejected",
    )
    sanitized_text: str = Field(
        default="",
        description="Normalized and whitespace-cleaned text when allowed",
    )
    input_length: int = Field(default=0, description="Character length of original input")
    moderation_engine: str = Field(
        default="nexora_rule_pattern_guardrail_v1",
        description="Identifier of the active moderation guardrail",
    )


class ContentModerationService:
    """
    Deterministic multi-category content moderation service.
    Screens for:
    1. Empty or malformed inputs
    2. Excessive input length
    3. Prompt injection & jailbreak instructions
    4. Abusive, violent, hate, or self-harm expressions
    5. Script / SQL / command injection attempts
    """

    PROMPT_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", re.I),
        re.compile(r"(reveal|show|print|output|leak)\s+(your\s+)?(system\s+prompt|api\s*key|secret\s*key|password|credentials)", re.I),
        re.compile(r"you\s+are\s+now\s+(in\s+)?(dan|developer|unrestricted|jailbreak)\s+mode", re.I),
        re.compile(r"bypass\s+(all\s+)?(safety|moderation|content|security)\s+(filters|rules|checks)", re.I),
        re.compile(r"disregard\s+system\s+guardrails", re.I),
    )

    UNSAFE_ABUSIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"\b(kill\s+yourself|commit\s+suicide|self[\s-]?harm)\b", re.I),
        re.compile(r"\b(how\s+to\s+(build|make)\s+a\s+(bomb|explosive|weapon))\b", re.I),
        re.compile(r"\b(terrorist\s+attack|mass\s+shooting|child\s+exploitation)\b", re.I),
        re.compile(r"\b(hate\s+speech|ethnic\s+cleansing|white\s+supremacy)\b", re.I),
        re.compile(r"\b(idiot\s+bot|stupid\s+scam|fraudulent\s+fake\s+malware)\b", re.I),
    )

    CODE_SQL_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
        re.compile(r"<\s*script\b[^>]*>", re.I),
        re.compile(r"javascript\s*:", re.I),
        re.compile(r"\b(drop\s+table|union\s+select|insert\s+into\s+users|delete\s+from\s+products)\b", re.I),
        re.compile(r"\b(os\.system|subprocess\.popen|rm\s+-rf\s+/|eval\s*\()\b", re.I),
    )

    def __init__(self) -> None:
        self._metrics: dict[str, Any] = {
            "total_checked": 0,
            "allowed_count": 0,
            "rejected_count": 0,
            "category_counts": {
                "empty_input": 0,
                "malformed_input": 0,
                "excessive_length": 0,
                "prompt_injection": 0,
                "unsafe_or_abusive_content": 0,
                "code_or_sql_injection": 0,
            },
        }

    def check_text(self, text: Any, field_name: str = "input") -> ModerationResult:
        """
        Validate and moderate a single text string.
        Never logs raw rejected user content to protect privacy and log hygiene.
        """
        self._metrics["total_checked"] += 1

        if not isinstance(text, str):
            self._record_rejection(["malformed_input"])
            return ModerationResult(
                allowed=False,
                flagged_categories=["malformed_input"],
                reason=f"Field '{field_name}' must be a valid text string.",
                sanitized_text="",
                input_length=0,
            )

        raw_len = len(text)
        cleaned = text.strip()

        if not cleaned:
            self._record_rejection(["empty_input"])
            return ModerationResult(
                allowed=False,
                flagged_categories=["empty_input"],
                reason=f"Field '{field_name}' cannot be empty or whitespace only.",
                sanitized_text="",
                input_length=raw_len,
            )

        # Check for null bytes or excessive non-printable control characters
        if "\x00" in cleaned or sum(1 for ch in cleaned if ord(ch) < 32 and ch not in "\n\r\t") > 3:
            self._record_rejection(["malformed_input"])
            return ModerationResult(
                allowed=False,
                flagged_categories=["malformed_input"],
                reason=f"Field '{field_name}' contains invalid control characters.",
                sanitized_text="",
                input_length=raw_len,
            )

        max_chars = settings.AI_MAX_INPUT_CHARS
        if raw_len > max_chars:
            self._record_rejection(["excessive_length"])
            return ModerationResult(
                allowed=False,
                flagged_categories=["excessive_length"],
                reason=f"Field '{field_name}' exceeds maximum allowed length of {max_chars} characters.",
                sanitized_text="",
                input_length=raw_len,
            )

        if not settings.AI_MODERATION_ENABLED:
            self._metrics["allowed_count"] += 1
            return ModerationResult(
                allowed=True,
                flagged_categories=[],
                reason=None,
                sanitized_text=re.sub(r"\s+", " ", cleaned),
                input_length=raw_len,
            )

        flagged: list[str] = []

        for pattern in self.PROMPT_INJECTION_PATTERNS:
            if pattern.search(cleaned):
                flagged.append("prompt_injection")
                break

        for pattern in self.UNSAFE_ABUSIVE_PATTERNS:
            if pattern.search(cleaned):
                flagged.append("unsafe_or_abusive_content")
                break

        for pattern in self.CODE_SQL_INJECTION_PATTERNS:
            if pattern.search(cleaned):
                flagged.append("code_or_sql_injection")
                break

        if flagged:
            self._record_rejection(flagged)
            logger.warning(
                "[ContentModeration] Rejected '%s' (length=%d) due to categories=%s",
                field_name,
                raw_len,
                flagged,
            )
            return ModerationResult(
                allowed=False,
                flagged_categories=flagged,
                reason=(
                    f"Input rejected by AI safety moderation ({', '.join(flagged)}). "
                    "Please submit a safe, product-related request."
                ),
                sanitized_text="",
                input_length=raw_len,
            )

        self._metrics["allowed_count"] += 1
        normalized = re.sub(r"[ \t]+", " ", cleaned)
        return ModerationResult(
            allowed=True,
            flagged_categories=[],
            reason=None,
            sanitized_text=normalized,
            input_length=raw_len,
        )

    def check_multiple_fields(self, fields: dict[str, Any]) -> ModerationResult:
        """Moderate a dictionary of named fields (e.g., product name, category, features)."""
        combined_length = 0
        for field_name, val in fields.items():
            if isinstance(val, list):
                joined = " | ".join(str(item) for item in val)
                res = self.check_text(joined, field_name=field_name)
            else:
                res = self.check_text(val, field_name=field_name)
            combined_length += res.input_length
            if not res.allowed:
                return res

        return ModerationResult(
            allowed=True,
            flagged_categories=[],
            reason=None,
            sanitized_text="all_fields_valid",
            input_length=combined_length,
        )

    def _record_rejection(self, categories: list[str]) -> None:
        self._metrics["rejected_count"] += 1
        for cat in categories:
            if cat in self._metrics["category_counts"]:
                self._metrics["category_counts"][cat] += 1

    def get_stats(self) -> dict[str, Any]:
        """Return moderation metrics and engine details."""
        return {
            "enabled": settings.AI_MODERATION_ENABLED,
            "engine": "nexora_rule_pattern_guardrail_v1",
            "max_input_chars": settings.AI_MAX_INPUT_CHARS,
            "metrics": self._metrics.copy(),
        }


moderation_service = ContentModerationService()
