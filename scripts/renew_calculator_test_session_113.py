"""Renew only the owned disposable fixture session; never reset data or bypass auth."""
import ast
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
runtime = Path('/tmp/openforge-award-integrity-91-20260914').resolve()
assert root.name == 'calculator-corrections-113' and root.parent.name == '.worktrees'
assert (runtime / 'acceptance.sqlite3').is_file()
# Reuse the existing test runner's exact private-environment configuration, not inherited DSNs.
tree = ast.parse((root / 'scripts/run_award_integrity_api_91.py').read_text())
setup = next(node for node in ast.walk(tree) if isinstance(node, ast.Call)
             and isinstance(node.func, ast.Attribute) and node.func.attr == 'update'
             and ast.unparse(node.func.value) == 'os.environ')
configuration = {arg.arg: ast.literal_eval(arg.value) for arg in setup.keywords
                 if arg.arg != 'OPENFORGE_DATABASE_URL'}
configuration['OPENFORGE_DATABASE_URL'] = 'sqlite:///' + str(runtime / 'acceptance.sqlite3')
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
