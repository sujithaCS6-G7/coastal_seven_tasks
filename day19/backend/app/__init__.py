"""Day 19 E-Commerce Application Package — Self-Bootstrapping Python Path Configuration."""

import os
import sys
from pathlib import Path

os.environ.setdefault("PURE_PYTHON", "1")

_APP_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _APP_DIR.parent
_DAY19_PACKAGES = _BACKEND_DIR.parent / ".packages"
_DAY10_SITE_PACKAGES = _BACKEND_DIR.parent.parent / "day10_ecommerce" / ".venv" / "Lib" / "site-packages"

_EXTRA_PATHS = [_DAY10_SITE_PACKAGES, _DAY19_PACKAGES, _BACKEND_DIR]
for _p in _EXTRA_PATHS:
    _p_str = str(_p)
    if _p.exists() and _p_str not in sys.path:
        sys.path.insert(0, _p_str)

# Also propagate PYTHONPATH for uvicorn --reload worker subprocesses
_existing_py_path = os.environ.get("PYTHONPATH", "")
_needed = [str(_p) for _p in (_DAY19_PACKAGES, _DAY10_SITE_PACKAGES, _BACKEND_DIR) if _p.exists()]
for _item in reversed(_needed):
    if _item not in _existing_py_path.split(os.pathsep):
        _existing_py_path = f"{_item}{os.pathsep}{_existing_py_path}" if _existing_py_path else _item
os.environ["PYTHONPATH"] = _existing_py_path
