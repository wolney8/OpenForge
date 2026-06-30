OddsForge is financial-risk-adjacent software. Incorrect calculations may cause real monetary loss.

Agents must treat calculation correctness, user approval, auditability, and test coverage as blocking requirements.

No code may provide stake, liability, profit, EV, arbitrage, cashback, refund, BOG, free bet, accumulator, bet builder, multi-lay or exposure values unless the relevant calculation mode has deterministic tests.

AI-generated recommendations must be labelled as advisory. The system must never auto-place bets or automate bookmaker bet confirmation.

Every calculation feature must expose:
- raw inputs
- calculated reference values
- selected strategy
- selected/user-entered values
- scenario outcomes
- liability
- commission
- assumptions
- rounding rules
- confidence or validation status

If an agent cannot identify the formula source, test fixture, or acceptance criteria for a calculation, it must raise a Blocking finding and stop.