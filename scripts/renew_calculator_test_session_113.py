"""Renew only the owned disposable fixture session; never reset data or bypass auth."""
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
runtime = Path('/tmp/openforge-award-integrity-91-20260914').resolve()
assert root.name == 'calculator-corrections-113' and root.parent.name == '.worktrees'
assert (runtime / 'acceptance.sqlite3').is_file()
# Reconstruct the owned test contract explicitly; never inherit a database target.
configuration = {
    'OPENFORGE_AUTH_REQUIRED': 'true',
    'OPENFORGE_AUTH_OWNER_EMAILS': 'notification-acceptance@example.invalid',
    'OPENFORGE_AUTH_SESSION_SECRET': 'synthetic-notification-acceptance-secret-not-used-in-production',
    'OPENFORGE_DATABASE_MODE': 'local',
    'OPENFORGE_DATABASE_URL': 'sqlite:///' + str(runtime / 'acceptance.sqlite3'),
    'OPENFORGE_RUNTIME_ROLE': 'test',
    'OPENFORGE_RUNTIME_DATABASE_IDENTITY': 'award-integrity-91',
    'OPENFORGE_RUNTIME_SOURCE_ROOT': str(root),
    'OPENFORGE_RUNTIME_SOURCE_REVISION': 'award-integrity-91-source',
    'OPENFORGE_RUNTIME_FRONTEND_ENDPOINT': 'http://localhost:3040',
    'OPENFORGE_RUNTIME_API_ENDPOINT': 'http://127.0.0.1:8039',
    'OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE': 'renew_calculator_test_session_113.py',
    'OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT': 'true',
}
assert configuration['OPENFORGE_AUTH_REQUIRED'] == 'true'
assert configuration['OPENFORGE_AUTH_OWNER_EMAILS'].endswith('@example.invalid')
os.environ.update(configuration)
sys.path.insert(0, str(root / 'apps/api/src'))
from openforge_api.auth import create_session_token  # noqa: E402

token = create_session_token(subject='pqa114-only',
                             email=configuration['OPENFORGE_AUTH_OWNER_EMAILS'], name='Synthetic')
destination = runtime / 'session-token'
destination.write_text(token)
destination.chmod(0o600)
print('Owned synthetic session renewed. Auth remains required; existing financial data unchanged.')
