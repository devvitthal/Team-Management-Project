"""
API Gateway — single entry point that proxies requests to internal microservices.

Routes:
  /api/v1/auth/{path}          -> http://auth-service:8001/{path}
  /api/v1/employees/{path}     -> http://employee-service:8002/{path}
  /api/v1/organizations/{path} -> http://organization-service:8003/{path}
  /api/v1/achievements/{path}  -> http://achievement-service:8004/{path}
  /api/v1/validations/{path}   -> http://validation-service:8005/{path}
"""

import logging
import os
import time
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "changeme-in-production")
ALGORITHM = "HS256"

SERVICE_MAP: dict[str, str] = {
    "auth": "http://auth-service:8001",
    "employees": "http://employee-service:8002",
    "organizations": "http://organization-service:8003",
    "achievements": "http://achievement-service:8004",
    "validations": "http://validation-service:8005",
}

# Routes that do NOT require a valid JWT (e.g. login, register)
PUBLIC_PATHS: set[str] = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/health",
}

logger = logging.getLogger("api_gateway")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


app = FastAPI(title="API Gateway", version="1.0.0")

_http_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def startup_event() -> None:
    global _http_client
    _http_client = httpx.AsyncClient(timeout=httpx.Timeout(30.0))


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global _http_client
    if _http_client:
        await _http_client.aclose()


def get_http_client() -> httpx.AsyncClient:
    """Return the shared HTTP client (dependency)."""
    if _http_client is None:
        raise RuntimeError("HTTP client not initialised")
    return _http_client



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.middleware("http")
async def log_latency(request: Request, call_next):
    """Log method, path, status code, and latency for every request."""
    start = time.perf_counter()
    response: Response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response




@app.exception_handler(httpx.ConnectError)
async def handle_connect_error(_: Request, exc: httpx.ConnectError) -> JSONResponse:
    """Return 503 when a downstream service is unreachable."""
    logger.error("Downstream service unreachable: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Downstream service is unavailable. Please try again later."},
    )


@app.exception_handler(httpx.TimeoutException)
async def handle_timeout(_: Request, exc: httpx.TimeoutException) -> JSONResponse:
    """Return 504 when a downstream service times out."""
    logger.error("Downstream service timed out: %s", exc)
    return JSONResponse(
        status_code=504,
        content={"detail": "Downstream service timed out. Please try again later."},
    )



bearer_scheme = HTTPBearer(auto_error=False)


def verify_jwt(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    """Validate the Bearer JWT. Raises 401 for missing or invalid tokens."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    return payload




async def _proxy(
    request: Request,
    target_url: str,
    client: httpx.AsyncClient,
    extra_headers: dict[str, str] | None = None,
) -> Response:
    """
    is forwarded upstream. hop-by-hop headers are stripped.
    """
    hop_by_hop = {"host", "connection", "transfer-encoding", "te", "trailer", "upgrade"}
    forwarded_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in hop_by_hop
    }
    if extra_headers:
        forwarded_headers.update(extra_headers)

    body = await request.body()

    upstream_response = await client.request(
        method=request.method,
        url=target_url,
        headers=forwarded_headers,
        content=body,
        params=request.query_params,
    )

    # Strip hop-by-hop headers from the upstream response.
    response_headers = {
        k: v
        for k, v in upstream_response.headers.items()
        if k.lower() not in hop_by_hop
    }

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=upstream_response.headers.get("content-type"),
    )




@app.get("/health", tags=["gateway"])
async def health_check() -> dict[str, str]:
    """Gateway liveness probe."""
    return {"status": "ok"}


@app.api_route(
    "/api/v1/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["auth"],
)
async def proxy_auth(
    path: str,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
) -> Response:
    """Proxy all auth-service traffic. No JWT validation needed."""
    target_url = f"{SERVICE_MAP['auth']}/{path}"
    return await _proxy(request, target_url, client)




@app.api_route(
    "/api/v1/employees/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["employees"],
)
async def proxy_employees(
    path: str,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    token_payload: Annotated[dict, Depends(verify_jwt)],
) -> Response:
    """Proxy to the employee-service, injecting authenticated user context."""
    target_url = f"{SERVICE_MAP['employees']}/{path}"
    extra_headers = {
        "X-User-ID": str(token_payload.get("sub", "")),
        "X-User-Role": str(token_payload.get("role", "")),
    }
    return await _proxy(request, target_url, client, extra_headers)


@app.api_route(
    "/api/v1/organizations/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["organizations"],
)
async def proxy_organizations(
    path: str,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    token_payload: Annotated[dict, Depends(verify_jwt)],
) -> Response:
    """Proxy to the organization-service, injecting authenticated user context."""
    target_url = f"{SERVICE_MAP['organizations']}/{path}"
    extra_headers = {
        "X-User-ID": str(token_payload.get("sub", "")),
        "X-User-Role": str(token_payload.get("role", "")),
    }
    return await _proxy(request, target_url, client, extra_headers)


@app.api_route(
    "/api/v1/achievements/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["achievements"],
)
async def proxy_achievements(
    path: str,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    token_payload: Annotated[dict, Depends(verify_jwt)],
) -> Response:
    """Proxy to the achievement-service, injecting authenticated user context."""
    target_url = f"{SERVICE_MAP['achievements']}/{path}"
    extra_headers = {
        "X-User-ID": str(token_payload.get("sub", "")),
        "X-User-Role": str(token_payload.get("role", "")),
    }
    return await _proxy(request, target_url, client, extra_headers)


@app.api_route(
    "/api/v1/validations/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    tags=["validations"],
)
async def proxy_validations(
    path: str,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    token_payload: Annotated[dict, Depends(verify_jwt)],
) -> Response:
    """Proxy to the validation-service, injecting authenticated user context."""
    target_url = f"{SERVICE_MAP['validations']}/{path}"
    extra_headers = {
        "X-User-ID": str(token_payload.get("sub", "")),
        "X-User-Role": str(token_payload.get("role", "")),
    }
    return await _proxy(request, target_url, client, extra_headers)
