"""Logging configuration for Day 9."""

import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configure structured console logging."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


logger = logging.getLogger("app")
