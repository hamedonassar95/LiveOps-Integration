#!/usr/bin/env python3
"""Send a fixed, metadata-only LiveOps CI result to the public Devobs receiver."""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


DEVOBS_DISPATCH_URL = "https://api.github.com/repos/hamedonassar95/Devobs/dispatches"
EXPECTED_REPOSITORY = "hamedonassar95/LiveOps-Integration"
EXPECTED_WORKFLOW = "LiveOps CI"
ALLOWED_CONCLUSIONS = {"success", "failure", "cancelled"}


class DispatchRejected(Exception):
    """A metadata or API response failed a bounded bridge check."""


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def build_payload(env: dict[str, str]) -> dict[str, object]:
    """Validate GitHub context and return the exact allowlisted dispatch body."""
    repository = env.get("SOURCE_REPOSITORY", "")
    branch = env.get("SOURCE_BRANCH", "")
    sha = env.get("SOURCE_SHA", "")
    workflow = env.get("SOURCE_WORKFLOW", "")
    event = env.get("SOURCE_EVENT", "")
    conclusion = env.get("SOURCE_CONCLUSION", "")

    if (repository != EXPECTED_REPOSITORY or branch != "main" or event != "push"
            or workflow != EXPECTED_WORKFLOW or conclusion not in ALLOWED_CONCLUSIONS
            or re.fullmatch(r"[0-9a-f]{40}", sha) is None):
        raise DispatchRejected("metadata_out_of_scope")

    try:
        run_id = int(env.get("SOURCE_RUN_ID", ""))
        run_attempt = int(env.get("SOURCE_RUN_ATTEMPT", ""))
    except ValueError as exc:
        raise DispatchRejected("invalid_run_metadata") from exc
    if run_id <= 0 or run_attempt <= 0:
        raise DispatchRejected("invalid_run_metadata")

    return {
        "event_type": "liveops_ci_result",
        "client_payload": {
            "source_repository": repository,
            "source_branch": branch,
            "source_sha": sha,
            "source_run_id": run_id,
            "source_run_attempt": run_attempt,
            "source_workflow": workflow,
            "source_conclusion": conclusion,
            "source_event": event,
        },
    }


def _write_summary(env: dict[str, str], message: str) -> None:
    summary_path = env.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    try:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write(f"## Devobs monitoring bridge\n\n{message}\n")
    except OSError:
        # The workflow log still reports the sanitized outcome if summaries are unavailable.
        pass


def send_dispatch(
    payload: dict[str, object],
    token: str,
    opener_factory: Callable[..., object] = build_opener,
) -> str:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    request = Request(
        DEVOBS_DISPATCH_URL,
        data=body,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "LiveOps-Devobs-CI-Bridge",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )
    opener = opener_factory(_NoRedirect)
    try:
        with opener.open(request, timeout=15) as response:  # type: ignore[attr-defined]
            if response.status != 204:
                raise DispatchRejected(f"unexpected_http_status_{response.status}")
    except HTTPError as exc:
        raise DispatchRejected(f"http_error_{exc.code}") from None
    except (URLError, TimeoutError, OSError):
        raise DispatchRejected("network_unavailable") from None
    return "dispatched"


def main(env: dict[str, str] | None = None, stdout=None, opener_factory=build_opener) -> int:
    values = os.environ if env is None else env
    output = sys.stdout if stdout is None else stdout
    token = values.get("DEVOBS_DISPATCH_TOKEN", "")
    if not token:
        message = "Not sent: the optional `DEVOBS_DISPATCH_TOKEN` secret is not configured."
        _write_summary(values, message)
        output.write("::warning::Devobs bridge is disabled because its optional repository secret is not configured.\n")
        return 0

    try:
        payload = build_payload(values)
        result = send_dispatch(payload, token, opener_factory)
    except DispatchRejected as exc:
        message = f"Not sent: `{exc}`."
        _write_summary(values, message)
        output.write(f"Devobs bridge: {exc}\n")
        return 1

    _write_summary(values, "Sent validated CI metadata to the Devobs receiver.")
    output.write(f"Devobs bridge: {result}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
