from fastapi import HTTPException, status

class HiveException(Exception):
    """Base exception for Hive business logic"""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ResourceNotFoundException(HiveException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class PermissionDeniedException(HiveException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)

class LogicConflictException(HiveException):
    def __init__(self, message: str = "Logic conflict"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)
