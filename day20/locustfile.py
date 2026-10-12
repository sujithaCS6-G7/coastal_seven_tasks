"""Root bridge for Locust load testing from E:\\PYTHON\\day19."""

import os
import sys
from pathlib import Path

os.environ.setdefault("PURE_PYTHON", "1")
_ROOT_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _ROOT_DIR / "backend"
_DAY19_PACKAGES = _ROOT_DIR / ".packages"
_DAY10_SITE_PACKAGES = _ROOT_DIR.parent / "day10_ecommerce" / ".venv" / "Lib" / "site-packages"
for _p in (_DAY10_SITE_PACKAGES, _DAY19_PACKAGES, _BACKEND_DIR):
    if _p.exists() and str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.locustfile import NexoraEcommerceLoadUser  # noqa: F401, E402
