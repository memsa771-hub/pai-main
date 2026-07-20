"""Domain-specific exceptions.

Each error carries an HTTP status and a stable machine-readable `error_code`
so the API layer can translate them into consistent JSON responses without
leaking stack traces (see CLAUDE.md sections 25 and 9).
"""

from __future__ import annotations


class PAIError(Exception):
    """Base class for all Placement AI domain errors."""

    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, message: str | None = None, *, error_code: str | None = None) -> None:
        self.message = message or self.__class__.__doc__ or "An error occurred."
        if error_code:
            self.error_code = error_code
        super().__init__(self.message)


class AuthenticationError(PAIError):
    """Authentication failed or credentials are missing."""

    status_code = 401
    error_code = "authentication_error"


class AuthorizationError(PAIError):
    """The authenticated user may not access this resource."""

    status_code = 403
    error_code = "authorization_error"


class ValidationError(PAIError):
    """Input failed validation."""

    status_code = 422
    error_code = "validation_error"


class NotFoundError(PAIError):
    """The requested resource does not exist."""

    status_code = 404
    error_code = "not_found"


class DocumentProcessingError(PAIError):
    """A document could not be parsed or extracted."""

    status_code = 422
    error_code = "document_processing_error"


class ResearchUnavailableError(PAIError):
    """External research could not be completed."""

    status_code = 503
    error_code = "research_unavailable"


class UnverifiedSourceError(PAIError):
    """Data could not be traced to a trusted source."""

    status_code = 422
    error_code = "unverified_source"


class MissingStudentDataError(PAIError):
    """A required student data point is missing (ask, never invent)."""

    status_code = 422
    error_code = "missing_student_data"


class AgentExecutionError(PAIError):
    """An agent failed while handling the request."""

    status_code = 500
    error_code = "agent_execution_error"


class ExternalProviderError(PAIError):
    """A third-party provider (DeepSeek, SerpAPI, Supabase) failed."""

    status_code = 502
    error_code = "external_provider_error"


class RateLimitError(PAIError):
    """Too many requests."""

    status_code = 429
    error_code = "rate_limited"
