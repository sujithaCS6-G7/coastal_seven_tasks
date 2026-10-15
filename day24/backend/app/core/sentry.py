"""Day 24: Sentry Real-Time Error Tracking & Performance Tracing Integration."""

import os
import logging
from typing import Optional

logger = logging.getLogger("nexora")

_sentry_initialized = False


def init_sentry(
    dsn: Optional[str] = None,
    environment: str = "production",
    release: str = "24.0.0",
    traces_sample_rate: float = 1.0,
) -> bool:
    """
    Initializes Sentry SDK if DSN is configured in environment or passed directly.
    Supports graceful fallback if SENTRY_DSN is absent or sentry-sdk is not installed.
    """
    global _sentry_initialized

    effective_dsn = dsn or os.getenv("SENTRY_DSN")
    if not effective_dsn:
        logger.info("Sentry DSN not provided; error tracking running in simulated local mode.")
        _sentry_initialized = False
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=effective_dsn,
            environment=environment,
            release=f"nexora@{release}",
            traces_sample_rate=traces_sample_rate,
            send_default_pii=False,  # Security: Do not leak user PII/passwords
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
        _sentry_initialized = True
        logger.info(f"Sentry SDK successfully initialized for environment='{environment}', release='{release}'")
        return True
    except ImportError:
        logger.warning("sentry-sdk package not installed. Sentry error tracking will be simulated.")
        _sentry_initialized = False
        return False
    except Exception as exc:
        logger.error(f"Failed to initialize Sentry: {exc}")
        _sentry_initialized = False
        return False


def is_sentry_active() -> bool:
    """Returns True if Sentry SDK is initialized and capturing exceptions."""
    return _sentry_initialized


def capture_exception(exc: Exception, context: Optional[dict] = None) -> Optional[str]:
    """Captures an exception to Sentry or logs it to structured logger."""
    if _sentry_initialized:
        try:
            import sentry_sdk

            if context:
                with sentry_sdk.push_scope() as scope:
                    for k, v in context.items():
                        scope.set_extra(k, v)
                    return sentry_sdk.capture_exception(exc)
            return sentry_sdk.capture_exception(exc)
        except Exception:
            pass

    logger.error(f"Exception captured: {exc}", exc_info=True)
    return "simulated-sentry-event-id"
