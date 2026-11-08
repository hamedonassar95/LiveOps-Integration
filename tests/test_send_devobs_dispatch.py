import io
import json
import unittest
from urllib.error import HTTPError

from scripts.send_devobs_dispatch import (
    DEVOBS_DISPATCH_URL,
    DispatchRejected,
    build_payload,
    main,
    send_dispatch,
)


SYNTHETIC_TOKEN = "synthetic-test-token-never-a-real-credential"
VALID_ENV = {
    "DEVOBS_DISPATCH_TOKEN": SYNTHETIC_TOKEN,
    "SOURCE_REPOSITORY": "hamedonassar95/LiveOps-Integration",
    "SOURCE_BRANCH": "main",
    "SOURCE_SHA": "a" * 40,
    "SOURCE_RUN_ID": "12345",
    "SOURCE_RUN_ATTEMPT": "2",
    "SOURCE_WORKFLOW": "LiveOps CI",
    "SOURCE_CONCLUSION": "failure",
    "SOURCE_EVENT": "push",
}


class FakeResponse:
    status = 204

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class FakeOpener:
    def __init__(self, response=None, error=None):
        self.response = response or FakeResponse()
        self.error = error
        self.request = None
        self.timeout = None

    def open(self, request, timeout):
        self.request = request
        self.timeout = timeout
        if self.error:
            raise self.error
        return self.response


class DevobsDispatchTests(unittest.TestCase):
    def test_builds_only_expected_ci_metadata_fields(self):
        payload = build_payload(VALID_ENV)
        self.assertEqual(payload["event_type"], "liveops_ci_result")
        self.assertEqual(set(payload["client_payload"]), {
            "source_repository", "source_branch", "source_sha", "source_run_id",
            "source_run_attempt", "source_workflow", "source_conclusion", "source_event",
        })
        self.assertEqual(payload["client_payload"]["source_run_id"], 12345)
        self.assertEqual(payload["client_payload"]["source_conclusion"], "failure")
        self.assertNotIn("token", json.dumps(payload).lower())

    def test_rejects_non_main_or_unexpected_source_metadata(self):
        for key, value in (("SOURCE_BRANCH", "feature/test"), ("SOURCE_EVENT", "pull_request"),
                           ("SOURCE_REPOSITORY", "attacker/other"),
                           ("SOURCE_CONCLUSION", "skipped"), ("SOURCE_SHA", "not-a-sha")):
            env = {**VALID_ENV, key: value}
            with self.subTest(key=key):
                with self.assertRaises(DispatchRejected):
                    build_payload(env)

    def test_missing_secret_skips_send_and_reports_it_without_failure(self):
        env = {key: value for key, value in VALID_ENV.items() if key != "DEVOBS_DISPATCH_TOKEN"}
        output = io.StringIO()
        result = main(env=env, stdout=output, opener_factory=lambda *_: self.fail("must not send"))
        self.assertEqual(result, 0)
        self.assertIn("not configured", output.getvalue())
        self.assertNotIn(SYNTHETIC_TOKEN, output.getvalue())

    def test_posts_to_fixed_devobs_endpoint_and_never_logs_token(self):
        fake = FakeOpener()
        payload = build_payload(VALID_ENV)
        result = send_dispatch(payload, SYNTHETIC_TOKEN, opener_factory=lambda *_: fake)
        self.assertEqual(result, "dispatched")
        self.assertEqual(fake.request.full_url, DEVOBS_DISPATCH_URL)
        self.assertEqual(fake.request.get_method(), "POST")
        self.assertEqual(fake.timeout, 15)
        self.assertEqual(json.loads(fake.request.data), payload)
        self.assertEqual(fake.request.get_header("Authorization"), f"Bearer {SYNTHETIC_TOKEN}")

    def test_refuses_redirects_and_sanitizes_http_errors(self):
        fake = FakeOpener(error=HTTPError(DEVOBS_DISPATCH_URL, 302, "redirect", None, None))
        with self.assertRaisesRegex(DispatchRejected, "http_error_302"):
            send_dispatch(build_payload(VALID_ENV), SYNTHETIC_TOKEN, opener_factory=lambda *_: fake)


if __name__ == "__main__":
    unittest.main()
