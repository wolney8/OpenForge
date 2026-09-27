"""Synthetic-only session preparation after the separately tested OAuth boundary.
Never accepts a normal/Preview database, identity or credential.
"""
from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'apps/api/src'))
from openforge_api.config import settings
from openforge_api.db import connect
from openforge_api.subscribers import accept_invitation, invitation_for_token
from openforge_api.auth import create_session_token

payload = json.load(sys.stdin)
assert payload['email'].endswith('@example.invalid')
settings.database_mode = 'local'
settings.database_url = 'sqlite:////private/tmp/cp056/synthetic.sqlite3'
settings.auth_session_secret = 'cp056-synthetic-session-only-not-production'
settings.auth_owner_emails = 'owner@example.invalid'
settings.tracker_seed_source = ''
settings.account_catalogue_source = str(root / 'tests/fixtures/openforge-api-master-catalogue.synthetic.json')
settings.runtime_role = 'test'
settings.runtime_database_identity = 'cp056-synthetic'
settings.runtime_source_root = str(root)
settings.runtime_source_revision = 'cp056-synthetic-browser'
settings.runtime_frontend_endpoint = 'http://localhost:3056'
settings.runtime_api_endpoint = 'http://127.0.0.1:8056'
settings.runtime_environment_source = 'committed-synthetic-browser-helper'
settings.runtime_database_target_explicit = True
if payload.get('action') == 'statements':
    from fastapi.testclient import TestClient
    from openforge_api.main import app
    sys.path.insert(0, str(root))
    from apps.api.tests.synthetic_setup import seed_synthetic_account
    pid = payload['profile_id']
    with connect() as c:
        assert c.execute('SELECT 1 FROM subscriber_applications WHERE email = ? AND profile_id = ?', (payload['email'], pid)).fetchone()
    seed_synthetic_account(profile_id=pid, name='Bookmaker A', account_type='Bookie')
    owner = TestClient(app)
    owner.cookies.set('pd_session', create_session_token(subject='cp056-owner', email='owner@example.invalid', name='Synthetic owner'))
    for month, final_value in [('01','100.00'),('02','0.00'),('03','-20.00')]:
        response=owner.post(f'/profiles/{pid}/sportsbook-bets',json={'sportsbook_bet_id':f'{pid}-{month}', 'event_name':'Synthetic confirmed statement', 'bookmaker':'Bookmaker A','status':'Settled','result':'Back Won','back_stake':'10.00','back_odds':'2.00','match_strategy':'No Lay','date_settled':f'2026-{month}-15','manual_override_value':final_value,'manual_override_reason':'Independent synthetic statement fixture'})
        assert response.status_code==201, response.text
        period=f'{pid}-period-{month}'
        response=owner.post(f'/profiles/{pid}/fee-periods',json={'fee_period_id':period,'period_start':f'2026-{month}-01','period_end':f'2026-{month}-'+('28' if month=='02' else '31'),'reporting_basis':'settled_final','fee_package_id':'SYNTHETIC-CP056','fee_package_version':1,'actor_id':'synthetic-owner'})
        assert response.status_code==201,response.text
        response=owner.post(f'/profiles/{pid}/fee-periods/{period}/crystallise',json={'actor_id':'synthetic-owner','confirmation':True})
        assert response.status_code==200,response.text
    print('Synthetic positive/zero/negative confirmed statements seeded')
    sys.exit(0)
row = invitation_for_token(payload['token'])
assert row['email'] == payload['email']
subject = 'synthetic-' + row['invitation_id']
accept_invitation(row['invitation_id'], row['token_hash'], payload['email'], subject, 'Synthetic Applicant')
print(create_session_token(subject=subject, email=payload['email'], name='Synthetic Applicant', role='prospective_subscriber'))
