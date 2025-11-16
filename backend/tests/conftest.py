import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os
from importlib import reload

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def test_app(tmp_path, monkeypatch):
    storage_root = tmp_path / "data"
    monkeypatch.setenv("AINTRA_STORAGE", str(storage_root))
    monkeypatch.setenv("AINTRA_CORS", "http://testserver")

    from app import storage

    reload(storage)
    from app import job_manager

    reload(job_manager)
    from app import main

    reload(main)

    app = main.app
    app.dependency_overrides.clear()
    yield app


@pytest.fixture
def client(test_app):
    with TestClient(test_app) as c:
        yield c

