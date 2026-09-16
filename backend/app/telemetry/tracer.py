import logging
import time
from contextlib import contextmanager
from typing import Optional, Generator, Any
import uuid

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace import Status, StatusCode, Span

from app.core.config import settings

logger = logging.getLogger("telemetry")

# Resource definition for Cloud Trace / OpenTelemetry
resource = Resource.create(attributes={
    "service.name": settings.OTEL_SERVICE_NAME,
    "service.version": settings.APP_VERSION,
    "deployment.environment": settings.APP_ENV,
})

provider = TracerProvider(resource=resource)

# Configure exporter based on environment
exporter_initialized = False

if settings.ENABLE_GCP_TRACE:
    try:
        from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
        cloud_exporter = CloudTraceSpanExporter(project_id=settings.GCP_PROJECT_ID)
        provider.add_span_processor(BatchSpanProcessor(cloud_exporter))
        logger.info("OpenTelemetry configured with Google Cloud Trace exporter")
        exporter_initialized = True
    except ImportError:
        logger.warning("opentelemetry-exporter-gcp-trace not installed. Falling back to ConsoleSpanExporter.")
    except Exception as e:
        logger.warning(f"Could not initialize CloudTraceSpanExporter: {e}. Falling back to Console.")

if not exporter_initialized:
    # Use SimpleSpanProcessor for local development/testing visibility
    if settings.DEBUG:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

trace.set_tracer_provider(provider)
tracer = trace.get_tracer(settings.OTEL_SERVICE_NAME)


def generate_trace_id() -> str:
    """Generate a clean UUID string for request-level tracing."""
    return str(uuid.uuid4())


@contextmanager
def trace_span(
    name: str,
    attributes: Optional[dict[str, Any]] = None
) -> Generator[Span, None, None]:
    """
    Context manager to trace synchronous or asynchronous spans with GenAI semantics.
    """
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                if value is not None:
                    span.set_attribute(key, str(value) if not isinstance(value, (int, float, bool)) else value)
        try:
            yield span
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise


def record_genai_metrics(
    span: Span,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    temperature: float = 0.2
) -> None:
    """Record standardized OpenTelemetry GenAI semantic conventions."""
    total_tokens = prompt_tokens + completion_tokens
    span.set_attribute("gen_ai.system", "google")
    span.set_attribute("gen_ai.request.model", model_name)
    span.set_attribute("gen_ai.request.temperature", temperature)
    span.set_attribute("gen_ai.usage.input_tokens", prompt_tokens)
    span.set_attribute("gen_ai.usage.output_tokens", completion_tokens)
    span.set_attribute("gen_ai.usage.total_tokens", total_tokens)
