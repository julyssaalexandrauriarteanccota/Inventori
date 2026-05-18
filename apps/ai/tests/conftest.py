import os
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

_ = os.environ.setdefault(
    "DATABASE_URL", "postgresql://test_user:test_password@localhost:5432/test_db"
)
_ = os.environ.setdefault("AI_INTERNAL_KEY", "test-ai-internal-key")
_ = os.environ.setdefault("API_SERVICE_URL", "http://localhost:4000")
_ = os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")


@pytest.fixture
def override_internal_key() -> str:
    from app.core.config import settings

    return settings.AI_INTERNAL_KEY


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
