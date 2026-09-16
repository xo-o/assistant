from app.memory.manager import memory_manager
from app.models.entities import ChatMessage


def test_session_strict_isolation(db_session):
    """
    Verify that concurrent sessions remain strictly isolated without context cross-contamination.
    """
    session_a = "user_session_alpha"
    session_b = "user_session_beta"

    # Add messages to session A
    memory_manager.add_message(session_a, "user", "Hola, me llamo Mario y busco una Pickup", db=db_session)
    memory_manager.add_message(session_a, "assistant", "¡Hola Mario! Con gusto te oriento sobre Pickups", db=db_session)

    # Add messages to session B
    memory_manager.add_message(session_b, "user", "Buenas tardes, soy Beatriz y busco un auto compacto", db=db_session)
    memory_manager.add_message(session_b, "assistant", "¡Hola Beatriz! Los compactos son geniales para ciudad", db=db_session)

    # Retrieve history for session A
    hist_a, _ = memory_manager.get_sliding_window_context(session_a, db=db_session)
    assert len(hist_a) == 2
    assert all("Beatriz" not in m["content"] for m in hist_a)
    assert any("Mario" in m["content"] for m in hist_a)

    # Retrieve history for session B
    hist_b, _ = memory_manager.get_sliding_window_context(session_b, db=db_session)
    assert len(hist_b) == 2
    assert all("Mario" not in m["content"] for m in hist_b)
    assert any("Beatriz" in m["content"] for m in hist_b)


def test_sliding_window_context_truncation(db_session):
    """
    Verify that old messages are pruned when exceeding token or message count thresholds.
    """
    session_id = "test_window_session"

    # Insert 10 messages
    for i in range(10):
        role = "user" if i % 2 == 0 else "assistant"
        memory_manager.add_message(session_id, role, f"Message turn number {i}", db=db_session)

    # Query with max_messages=4
    hist, tokens = memory_manager.get_sliding_window_context(
        session_id=session_id,
        max_messages=4,
        db=db_session
    )

    assert len(hist) == 4
    # Must preserve the most recent messages (6, 7, 8, 9)
    assert "Message turn number 9" in hist[-1]["content"]
    assert "Message turn number 6" in hist[0]["content"]
    assert tokens > 0


def test_token_estimation():
    """Verify heuristic token calculation."""
    text = "Hola, estoy interesado en una camioneta familiar"
    tokens = memory_manager.estimate_tokens(text)
    assert tokens > 5
    assert memory_manager.estimate_tokens("") == 0
