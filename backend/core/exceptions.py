from typing import Optional

class AetherException(Exception):
    """
    Base exception class for all custom THE MRIDANSH HQ system exceptions.
    """
    status_code: int = 500
    error_code: str = "SYSTEM_ERROR"

    def __init__(self, message: str, details: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.details = details or message


class AetherAuthenticationException(AetherException):
    status_code = 401
    error_code = "AUTHENTICATION_ERROR"


class AetherAuthorizationException(AetherException):
    status_code = 403
    error_code = "AUTHORIZATION_ERROR"


class AetherValidationException(AetherException):
    status_code = 422
    error_code = "VALIDATION_ERROR"


class AetherDatabaseException(AetherException):
    status_code = 500
    error_code = "DATABASE_ERROR"


class AetherDatabaseConflictException(AetherException):
    status_code = 409
    error_code = "DATABASE_CONFLICT"


class AetherNetworkException(AetherException):
    status_code = 502
    error_code = "NETWORK_ERROR"


class AetherFilesystemException(AetherException):
    status_code = 500
    error_code = "FILESYSTEM_ERROR"


class AetherApplicationException(AetherException):
    status_code = 500
    error_code = "APPLICATION_ERROR"
