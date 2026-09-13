"""Synthetic workbook-shaped browser upload fixtures; no financial expected-answer engine."""
from pathlib import Path
from openforge_api.xlsx_export import (
    build_ledger_export, ACCOUNT_EXPORT_HEADERS, SPORTSBOOK_EXPORT_HEADERS, FREE_BET_EXPORT_HEADERS,
)

runtime = Path('/tmp/openforge-populated-audit-114-20260913')
assert (runtime / 'acceptance.sqlite3').is_file(), 'Owned synthetic runtime required'
account = dict(AccountID='PQA-IMP-AC-001', Account='Bet365', Type='Bookie',
               Channel='Online', Status='Active', CurrentBalance='12.34', PendingWithdrawalAmount='0.00')
account['Counts In Cash Total'] = 'Yes'
zero = dict(account, AccountID='PQA-IMP-AC-002', Account='Smarkets', Type='Exchange', CurrentBalance='0.00')
sports = dict(QualBetID='PQA-IMP-QB-001', DateSettling='2026-09-13T12:00:00',
              EventName='Synthetic imported event', Bookmaker='Bet365', OfferType='Bet & Get',
              BetType='Single', FixtureType='Football', Status='Settled', Result='Back Won',
              BackStake='10.00', BackOdds='5.00', MatchStrategy='Standard', LayOdds1='5.20', Exchange='Smarkets')
sports['Lay (Actual)'] = '9.00'
free = dict(FreeBetID='PQA-IMP-FB-001', DateSettling='2026-09-13T12:00:00',
            ExpiryDateTime='2026-09-20T12:00:00', EventName='Synthetic imported child',
            Bookmaker='Bet365', OfferType='Bet & Get', BetType='Single', FixtureType='Football',
            Status='Available', Result='Pending', FreeBetValue='10.00',
            FreeBetRetentionMode='SNR', MatchStrategy='Standard', OriginQualBetID='PQA-IMP-QB-001')
cases = [
    ('accounts-valid', ACCOUNT_EXPORT_HEADERS, 'Accounts', 'tblAccounts', [account, zero]),
    ('sportsbook-valid', SPORTSBOOK_EXPORT_HEADERS, 'Sportsbook Bets', 'tblSportsbookBets', [sports]),
    ('free-bets-linked', FREE_BET_EXPORT_HEADERS, 'Free Bets', 'tblFreeBets', [free]),
    ('accounts-invalid', ACCOUNT_EXPORT_HEADERS, 'Accounts', 'tblAccounts',
     [dict(account, AccountID='PQA-IMP-AC-BAD', CurrentBalance='not-money')]),
]
for name, headers, sheet, table, rows in cases:
    (runtime / f'{name}.xlsx').write_bytes(build_ledger_export(rows, headers=headers, sheet_name=sheet, table_name=table))
print('Four synthetic approved-header/table upload fixtures prepared; observations remain separate.')
