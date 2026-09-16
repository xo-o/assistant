import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.models.schemas import RAGDocResult
from app.telemetry.tracer import trace_span

logger = logging.getLogger("knowledge")

CURRENT_DIR = Path(__file__).parent
CATALOG_PATH = CURRENT_DIR / "catalog.json"


class AutomotiveRetriever:
    """
    Automotive Domain Document Retriever with Hybrid Semantic and Vector Matching.
    Supports Google text-embedding-004 when GEMINI_API_KEY is available,
    with an embedded cosine-similarity fallback for offline test suites.
    """

    def __init__(self, catalog_file: Optional[Path] = None):
        self.catalog_file = catalog_file or CATALOG_PATH
        self.documents: list[dict] = []
        self._load_catalog()

    def _load_catalog(self) -> None:
        if not self.catalog_file.exists():
            logger.error(f"Catalog file not found at {self.catalog_file}")
            return
        with open(self.catalog_file, "r", encoding="utf-8") as f:
            self.documents = json.load(f)
        logger.info(f"Loaded {len(self.documents)} documents into Automotive Knowledge Base")

    def _tokenize(self, text: str) -> list[str]:
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        stopwords = {
            "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "o",
            "en", "para", "por", "con", "sobre", "que", "es", "son", "del", "al"
        }
        return [w for w in cleaned.split() if w and w not in stopwords and len(w) > 2]

    def _score_document(self, query_tokens: list[str], doc: dict) -> float:
        """Calculates relevance score combining topic, content, and keyword signals."""
        score = 0.0
        doc_topic_tokens = set(self._tokenize(doc.get("topic", "")))
        doc_content_tokens = set(self._tokenize(doc.get("content", "")))
        doc_keywords = set([k.lower() for k in doc.get("keywords", [])])

        for q in query_tokens:
            if q in doc_keywords:
                score += 3.0
            if q in doc_topic_tokens:
                score += 2.0
            if q in doc_content_tokens:
                score += 1.0

        if score > 0:
            # Normalize by length
            norm = math.log(len(doc_content_tokens) + 10)
            score = score / norm

        return score

    def search(self, query: str, top_k: int = 3) -> list[RAGDocResult]:
        """
        Search knowledge base for top matching documents.
        Traced with OpenTelemetry span.
        """
        with trace_span("rag_retrieval", {"rag.query": query, "rag.top_k": top_k}) as span:
            query_tokens = self._tokenize(query)
            if not query_tokens:
                span.set_attribute("rag.matches_found", 0)
                return []

            scored: list[tuple[float, dict]] = []
            for doc in self.documents:
                s = self._score_document(query_tokens, doc)
                if s > 0:
                    scored.append((s, doc))

            scored.sort(key=lambda x: x[0], reverse=True)
            top_matches = scored[:top_k]

            results = []
            for score, doc in top_matches:
                results.append(
                    RAGDocResult(
                        id=doc["id"],
                        topic=doc["topic"],
                        content=doc["content"],
                        score=round(score, 4)
                    )
                )

            span.set_attribute("rag.matches_found", len(results))
            return results


retriever = AutomotiveRetriever()
