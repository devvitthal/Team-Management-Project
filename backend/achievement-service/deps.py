"""JWT authentication and role-based authorisation dependencies for Achievement Service."""

import logging
import os
from typing import Any, Dict, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "changeme-in-production-use-strong-secret")
_ALGORITHM = "HS256"

_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    """Validate Bearer JWT and return decoded payload. Raises 401 if invalid."""
    try:
        payload = jwt.decode(credentials.credentials, _SECRET_KEY, algorithms=[_ALGORITHM])
    except JWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing subject claim",
        )

    return payload


def require_roles(allowed_roles: List[str]):
    """Return a dependency that enforces role-based access. Raises 403 if denied."""

    def _check(
        current_user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        """Assert the user holds one of the allowed roles."""
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions",
            )
        return current_user

    return _check
