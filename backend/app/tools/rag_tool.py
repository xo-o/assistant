import logging
from typing import Optional

from app.knowledge.retriever import retriever
from app.models.schemas import RAGQueryInput, RAGQueryOutput
from app.telemetry.tracer import trace_span

logger = logging.getLogger("tools.rag")


def execute_base_conocimientos_autos(query: str, top_k: int = 3) -> dict:
    """
    Executes base_conocimientos_autos tool: searches the automotive knowledge base.
    Returns matched documents regarding body types, powertrains, maintenance, and technical terms.
    """
    with trace_span("tool.base_conocimientos_autos", {"rag.query": query}) as span:
        safe_input = RAGQueryInput(query=query, top_k=top_k)
        docs = retriever.search(query=safe_input.query, top_k=safe_input.top_k)

        span.set_attribute("rag.returned_docs", len(docs))
        output = RAGQueryOutput(results=docs)
        return output.model_dump()
