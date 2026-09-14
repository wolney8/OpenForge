import pytest
from openforge_api.calculators import MatchedBettingPayload, _calculate

@pytest.mark.parametrize('kind,trigger,face,estimate', [('cash','9.38',None,None),('free_bet','-0.62','10.00','7.00')])
def test_qualifying_loss_then_conditional_cash_or_credit(kind, trigger, face, estimate):
    r=_calculate(MatchedBettingPayload(bet_type='cashback',back_stake='10',back_odds='4',lay_odds='4.2',exchange_commission='0.02',promotion_value='10',cashback_reward_kind=kind))
    assert r.selected_lay_stake=='9.57'
    assert r.matched_result=='-0.62'
    assert [row.total for row in r.outcomes]==['-0.62','-0.62',trigger]
    assert r.cashback_credit_face_value==face
    assert r.cashback_estimated_retained_value==estimate

def test_refund_cap_and_custom_are_not_a_second_bonus_equalisation():
    r=_calculate(MatchedBettingPayload(bet_type='cashback',strategy='Custom',manual_lay_stake='9',back_stake='10',back_odds='4',lay_odds='4.2',exchange_commission='0.02',promotion_value='5'))
    assert r.selected_lay_stake=='9.00'
    assert [row.total for row in r.outcomes]==['1.20','-1.18','3.82']
