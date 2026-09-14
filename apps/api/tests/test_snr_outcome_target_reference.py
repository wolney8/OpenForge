from decimal import Decimal, ROUND_HALF_UP

import pytest

from openforge_api.calculators import MatchedBettingPayload, _calculate
from fastapi import HTTPException


@pytest.mark.parametrize('strategy,stake,liability,back,lay', [
    ('Standard','7.18','22.98','7.02','7.04'),
    ('Underlay','6.25','20.00','10.00','6.13'),
    ('Overlay','10.20','32.64','-2.64','10.00'),
    ('Custom','9.00','28.80','1.20','8.82'),
])
def test_will_snr_observation_independent_fixture(strategy, stake, liability, back, lay):
    result = _calculate(MatchedBettingPayload(bet_type='free_bet', strategy=strategy,
        back_stake='10',back_odds='4',lay_odds='4.2',exchange_commission='0.02',
        manual_lay_stake='9' if strategy == 'Custom' else ''))
    assert (result.selected_lay_stake,result.liability,result.pnl_if_back_wins,result.pnl_if_lay_wins) == (stake,liability,back,lay)


@pytest.mark.parametrize('f,b,o,c', [('10','3','3.1','0'),('7.13','8.21','9.02','0.05'),('1','2','2.5','0.02'),('10','4','4.2','0.025')])
@pytest.mark.parametrize('strategy',['Standard','Underlay','Overlay'])
def test_independent_equations_and_penny_placement(f,b,o,c,strategy):
    F,B,O,C=map(Decimal,(f,b,o,c))
    raw={'Standard':F*(B-1)/(O-C),'Underlay':F*(B-2)/(O-1),'Overlay':F/(1-C)}[strategy]
    placed=raw.quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    liability=(placed*(O-1)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    expected_back=(F*(B-1)-liability).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    expected_lay=(placed*(1-C)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    r=_calculate(MatchedBettingPayload(bet_type='free_bet',strategy=strategy,back_stake=f,back_odds=b,lay_odds=o,exchange_commission=c))
    assert Decimal(r.selected_lay_stake)==placed
    assert Decimal(r.liability)==liability
    assert Decimal(r.pnl_if_back_wins)==expected_back
    assert Decimal(r.pnl_if_lay_wins)==expected_lay


@pytest.mark.parametrize('strategy,b,c',[('Underlay','1.5','0'),('Overlay','4','1')])
def test_unavailable_endpoint_is_not_invented(strategy,b,c):
    with pytest.raises(HTTPException) as error:
        _calculate(MatchedBettingPayload(bet_type='free_bet',strategy=strategy,back_stake='10',back_odds=b,lay_odds='4.2',exchange_commission=c))
    assert error.value.status_code==422


def test_advanced_custom_reference_does_not_select_custom():
    r=_calculate(MatchedBettingPayload(bet_type='free_bet',strategy='Standard',back_stake='10',back_odds='4',lay_odds='4.2',exchange_commission='0.02',show_custom_reference=True,custom_reference_lay_stake='9'))
    assert r.selected_lay_stake=='7.18'
    custom=next(ref for ref in r.strategy_references if ref.strategy=='Custom')
    assert (custom.lay_stake, custom.liability, custom.back_wins_total, custom.back_loses_total)==('9.00','28.80','1.20','8.82')
