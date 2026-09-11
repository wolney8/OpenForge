# Calculator manual comparison worksheet

_Created 2026-09-11. Editable by Will. Platform baseline: `8c05e78` plus the UI commit recorded
below after this tranche lands._

## How to use

1. Open the same case in Plum Duff and the linked public calculator, preserving every unit and
   toggle. Enter observations in the blank/TODO cells; enter an actual zero as `0.00`.
2. Record the displayed value, not a value inferred from another column. Add a screenshot filename
   or note where a control is unavailable/login-only. Never fill a third-party column from Plum Duff.
3. Upload this Markdown file back into chat. Preserve the stable case IDs when editing or copying a
   case. Automated captures are explicitly labelled; all other observation cells begin `TODO`.

## Coverage checklist

- [ ] [Standard Normal, SNR and SR](#standard-qualifying-and-free-bets) — Simple and Advanced
- [ ] [Bonus Lock-In](#bonus-lock-in) — Normal/SNR × Loses/Wins × five strategies
- [ ] [Cashback/Money Back and all Profit Boost sources](#cashback-money-back-and-profit-boost)
- [ ] [Multi-leg and specialist financial calculators](#multi-leg-and-specialist-financial-calculators)
- [ ] [Odds/Probability and Blackjack Strategy](#utility-and-decision-support)
- [ ] [Required unsupported Bonus Free Bet SR](#case-bonus-sr-blocked-001)

Third-party links used below: [Outplayed Bonus Lock-In](https://outplayed.com/calculators/bonus-lockin-calculator),
[MBB matched betting](https://matchedbettingblog.com/matched-betting-calculator/),
[MBB bet calculator](https://matchedbettingblog.com/bet-calculator/),
[MBB Each Way](https://matchedbettingblog.com/each-way-calculator/),
[MBB Sequential Lay](https://matchedbettingblog.com/sequential-lay-calculator/),
[MBB Early Payout](https://matchedbettingblog.com/early-payout-calculator/),
[MBB Odds Converter](https://matchedbettingblog.com/odds-converter/),
[Outplayed Dutching guide](https://outplayed.com/dutching-calculator-guide), and
[Outplayed Blackjack](https://outplayed.com/blackjack-strategy-calculator).

## Standard: qualifying and free bets

### Case STD-NORMAL-ADV-001

- Case ID: `STD-NORMAL-ADV-001`
- Calculator / offer: Standard — qualifying/free-bet workflow
- Backing type: Normal
- Simple/Advanced mode: Advanced
- Actual selected strategy: Standard, then Underlay, Overlay, Custom and Part Lay
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO — equivalent standard calculator URL if available
- MBB URL: https://matchedbettingblog.com/matched-betting-calculator/
- Notes / screenshot reference: TODO

Independent expected basis: half-up penny placement; `Lstd=B×Ob/(Ol-c)`,
`Lunder=B×(Ob−1)/(Ol−1)`, `Lover=B/(1−c)`; Custom/Part Lay use the entered stake.

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Back stake (£) | 10.00 | TODO | TODO |
| Back odds (decimal) | 4.00 | TODO | TODO |
| Lay odds (decimal) | 4.20 | TODO | TODO |
| Exchange commission (decimal; 0.02 = 2%) | 0.02 | TODO | TODO |
| Custom lay (£) | 9.00 | TODO | TODO |
| Part-lay stake (£) | 4.00 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / liability (£) | 9.57 / 30.62 | TODO | TODO | TODO |
| Standard back-win / lay-win P&L (£) | -0.62 / -0.62 | TODO | TODO | TODO |
| Underlay lay / liability (£) | 9.38 / 30.02 | TODO | TODO | TODO |
| Underlay back-win / lay-win P&L (£) | -0.02 / -0.81 | TODO | TODO | TODO |
| Overlay lay / liability (£) | 10.20 / 32.64 | TODO | TODO | TODO |
| Overlay back-win / lay-win P&L (£) | -2.64 / 0.00 | TODO | TODO | TODO |
| Custom copied stake (£) | 9.00 | TODO | TODO | TODO |
| Part Lay copied stake (£) | 4.00 | TODO | TODO | TODO |

### Case STD-FREE-SNR-001

- Case ID: `STD-FREE-SNR-001`
- Calculator / offer: Standard — Free Bet SNR
- Backing type: Free Bet SNR
- Simple/Advanced mode: Simple, then Advanced
- Actual selected strategy: Standard/Underlay/Overlay/Custom/Part Lay
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/matched-betting-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Free-bet value (£) | 10.00 | TODO | TODO |
| Back odds | 4.00 | TODO | TODO |
| Lay odds | 4.20 | TODO | TODO |
| Commission (decimal) | 0.02 | TODO | TODO |
| Custom / Part Lay (£) | 9.00 / 4.00 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / back-win / lay-win (£) | 7.18 / 7.02 / 7.04 | TODO | TODO | TODO |
| Underlay lay / outcomes (£) | 6.66 / 8.69 / 6.53 | TODO | TODO | TODO |
| Overlay lay / outcomes (£) | 9.33 / 0.14 / 9.14 | TODO | TODO | TODO |
| Exact copied Custom / Part stake (£) | 9.00 / 4.00 | TODO | TODO | TODO |

### Case STD-FREE-SR-001

- Case ID: `STD-FREE-SR-001`
- Calculator / offer: Standard — Free Bet SR
- Backing type: Free Bet SR
- Simple/Advanced mode: Simple, then Advanced
- Actual selected strategy: Standard/Underlay/Overlay/Custom/Part Lay
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/matched-betting-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Free-bet value / back odds / lay odds | 10.00 / 4.00 / 4.20 | TODO | TODO |
| Commission (decimal) | 0.02 | TODO | TODO |
| Custom / Part Lay (£) | 9.00 / 4.00 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / back-win / lay-win (£) | 9.57 / 9.38 / 9.38 | TODO | TODO | TODO |
| Custom lay / outcomes (£) | 9.00 / 11.20 / 8.82 | TODO | TODO | TODO |
| Part Lay / outcomes (£) | 4.00 / 27.20 / 3.92 | TODO | TODO | TODO |

## Bonus Lock-In

### Case BONUS-NORMAL-LOSE-001 — required baseline

- Case ID: `BONUS-NORMAL-LOSE-001`
- Calculator / offer: Bonus Lock-In
- Backing type: Normal
- Simple/Advanced mode: Outplayed-style complete reference arrangement
- Actual selected strategy: Standard, Underlay, Overlay, Custom, Part Lay
- Bonus trigger, where relevant: Loses
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/bonus-lockin-calculator
- MBB URL: https://matchedbettingblog.com/matched-betting-calculator/
- Notes / screenshot reference: Automated Outplayed capture 2026-09-11 is recorded separately in
  the #113 audit; leave observations below editable.

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Back stake (£) | 5.00 | TODO | TODO |
| Back odds | 9.24 | TODO | TODO |
| Lay odds | 10.50 | TODO | TODO |
| Exchange commission (decimal / percent) | 0 / 0% | TODO | TODO |
| Bonus amount (£) | 5.00 | TODO | TODO |
| Bonus retention | 70% | TODO | TODO |
| Custom lay / Part Lay (£) | 2.92 / 2.00 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / liability (£) | 4.07 / 38.67 | TODO | TODO | TODO |
| Standard outcomes: back wins / back loses (£) | 2.53 / 2.57 | TODO | TODO | TODO |
| Underlay lay / liability (£) | 1.50 / 14.25 | TODO | TODO | TODO |
| Underlay outcomes (£) | 26.95 / 0.00 | TODO | TODO | TODO |
| Overlay lay / liability (£) | 4.34 / 41.23 | TODO | TODO | TODO |
| Overlay outcomes (£) | -0.03 / 2.84 | TODO | TODO | TODO |
| Custom lay / liability / outcomes (£) | 2.92 / 27.74 / 13.46 / 1.42 | TODO | TODO | TODO |
| Part Lay / liability / outcomes (£) | 2.00 / 19.00 / 22.20 / 0.50 | TODO | TODO | TODO |
| Exact copied selected stake (£) | selected value above | TODO | TODO | TODO |

### Case BONUS-NORMAL-WIN-001

- Case ID: `BONUS-NORMAL-WIN-001`
- Calculator / offer: Bonus Lock-In
- Backing type: Normal
- Simple/Advanced mode: complete reference arrangement
- Actual selected strategy: Standard/Underlay/Overlay/Custom/Part Lay
- Bonus trigger, where relevant: Wins
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/bonus-lockin-calculator
- MBB URL: TODO — no confirmed equivalent inverse-trigger interface
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Stake / back odds / lay odds | 5.00 / 9.24 / 10.50 | TODO | TODO |
| Bonus / retention / commission | 5.00 / 70% / 0% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / liability / outcomes (£) | 4.73 / 44.94 / -0.24 / -0.27 | TODO | TODO | TODO |
| Underlay lay / liability / outcomes (£) | 4.71 / 44.75 / -0.05 / -0.29 | TODO | TODO | TODO |
| Overlay lay / liability / outcomes (£) | 5.00 / 47.50 / -2.80 / 0.00 | TODO | TODO | TODO |

### Case BONUS-SNR-LOSE-001

- Case ID: `BONUS-SNR-LOSE-001`
- Calculator / offer: Bonus Lock-In
- Backing type: Free Bet SNR
- Simple/Advanced mode: complete reference arrangement
- Actual selected strategy: Standard/Underlay/Overlay/Custom/Part Lay
- Bonus trigger, where relevant: Loses
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/bonus-lockin-calculator
- MBB URL: TODO
- Notes / screenshot reference: Non-zero commission comparison must record Outplayed's `(1+c)`
  approximation separately from OpenForge's exact `(1-c)` target equation.

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Free-bet value / back odds / lay odds | 5.00 / 9.24 / 10.50 | TODO | TODO |
| Bonus / retention / commission | 5.00 / 70% / 0% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / liability / outcomes (£) | 3.59 / 34.11 / 7.09 / 7.09 | TODO | TODO | TODO |
| Underlay lay / liability / outcomes (£) | 1.50 / 14.25 / 26.95 / 5.00 | TODO | TODO | TODO |
| Overlay lay / liability / outcomes (£) | 4.34 / 41.23 / -0.03 / 7.84 | TODO | TODO | TODO |

### Case BONUS-SNR-WIN-001

- Case ID: `BONUS-SNR-WIN-001`
- Calculator / offer: Bonus Lock-In
- Backing type: Free Bet SNR
- Simple/Advanced mode: complete reference arrangement
- Actual selected strategy: Standard/Underlay/Overlay/Custom/Part Lay
- Bonus trigger, where relevant: Wins
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/bonus-lockin-calculator
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Free-bet value / back odds / lay odds | 5.00 / 9.24 / 10.50 | TODO | TODO |
| Bonus / retention / commission | 5.00 / 70% / 0% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / liability / outcomes (£) | 4.26 / 40.47 / 4.23 / 4.26 | TODO | TODO | TODO |
| Underlay lay / liability / outcomes (£) | 4.18 / 39.71 / 4.99 / 4.18 | TODO | TODO | TODO |
| Overlay lay / liability / outcomes (£) | 5.00 / 47.50 / -2.80 / 5.00 | TODO | TODO | TODO |

### Case BONUS-SR-BLOCKED-001

- Case ID: `BONUS-SR-BLOCKED-001`
- Calculator / offer: Bonus Lock-In — required deferred configuration
- Backing type: Free Bet SR
- Simple/Advanced mode: TODO
- Actual selected strategy: TODO
- Bonus trigger, where relevant: Loses/Wins
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/bonus-lockin-calculator
- MBB URL: TODO
- Notes / screenshot reference: Platform intentionally does not expose this configuration; current
  Outplayed source offers Normal and SNR only. Leave observations available for new authority.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Candidate complete settings | TODO | Unavailable in current public control | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Required lay/outcomes | BLOCKED — backing/reward contract absent | TODO | Unavailable | TODO |

## Cashback, Money Back and Profit Boost

### Case CASHBACK-001

- Case ID: `CASHBACK-001`
- Calculator / offer: Cashback / governed Money Back compatibility
- Backing type: Normal
- Simple/Advanced mode: N/A
- Actual selected strategy: Standard then explicit alternatives
- Bonus trigger, where relevant: Loses
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/matched-betting-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---:|---:|---:|
| Stake / back odds / lay odds | 10 / 4 / 4.2 | TODO | TODO |
| Commission / cashback | 2% / £5 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---:|---:|---:|---:|
| Standard lay / normal branches / trigger branch (£) | 9.57 / -0.62 / -0.62 / 4.38 | TODO | TODO | TODO |

### Case PROFIT-BOOST-ODDS-001

- Case ID: `PROFIT-BOOST-ODDS-001`
- Calculator / offer: Profit Boost
- Backing type: Normal
- Simple/Advanced mode: N/A
- Actual selected strategy: Standard; repeat Underlay/Overlay/Custom/Part Lay as needed
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / displayed boosted odds | £10 / 3.20 | TODO | TODO |
| Lay odds / commission | 4.20 / 2% | TODO | TODO |
| Accepted odds override | blank, then 3.18 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Displayed mode effective odds / return / profit | 3.20 / £32 / £22 | TODO | TODO | TODO |
| Accepted-odds effective value | 3.18 | TODO | TODO | TODO |

### Case PROFIT-BOOST-RETURN-002

- Case ID: `PROFIT-BOOST-RETURN-002`
- Calculator / offer: Profit Boost — bookmaker total return
- Backing type: Normal
- Simple/Advanced mode: N/A
- Actual selected strategy: Standard; repeat alternatives as needed
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / total return including stake | £10 / £27.86 | TODO | TODO |
| Lay odds / commission | 4.20 / 2% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Raw odds / hedge odds | 2.786 / 2.78 | TODO | TODO | TODO |
| Bookmaker return / conservative odds return | £27.86 / £27.80 | TODO | TODO | TODO |

### Case PROFIT-BOOST-PROFIT-003

- Case ID: `PROFIT-BOOST-PROFIT-003`
- Calculator / offer: Profit Boost — bookmaker potential profit
- Backing type: Normal
- Simple/Advanced mode: N/A
- Actual selected strategy: Standard; repeat alternatives as needed
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / profit excluding stake | £10 / £22 | TODO | TODO |
| Lay odds / commission | 4.20 / 2% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Effective odds / gross return / profit | 3.20 / £32 / £22 | TODO | TODO | TODO |

### Case PROFIT-BOOST-PERCENT-004

- Case ID: `PROFIT-BOOST-PERCENT-004`
- Calculator / offer: Profit Boost — original odds and percentage
- Backing type: Normal
- Simple/Advanced mode: N/A
- Actual selected strategy: Standard; repeat alternatives as needed
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / original odds / boost | £10 / 3.00 / 10% | TODO | TODO |
| Lay odds / commission / optional cap | 4.20 / 2% / blank | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Equation | `1 + (3.00−1) × 1.10 = 3.20` | TODO | TODO | TODO |
| Effective odds / gross return / profit | 3.20 / £32 / £22 | TODO | TODO | TODO |

## Multi-leg and specialist financial calculators

### Case MULTI-LAY-001

- Case ID: `MULTI-LAY-001`
- Calculator / offer: Multi-Lay
- Backing type: Normal
- Simple/Advanced mode: Standard allocation, then Underlay allocation
- Actual selected strategy: Multi-Lay
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/multi-lay-calculator
- MBB URL: https://matchedbettingblog.com/multi-lay-calculator/
- Notes / screenshot reference: Repeat with 2 and 3 legs and non-uniform commissions. Automated MBB capture, 2026-09-11, bundle `bf394d…01b4`: stakes £16.33/£13.56, liabilities £24.49/£27.12, every total £18.39, exposure £10.93. This is separate from Will's blank observations below.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Stake / back odds / commission | £10 / 4.00 / 5% | TODO | TODO |
| Lay legs | A 2.50; B 3.00 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Standard leg stakes/liabilities | £16.33/£24.50; £13.56/£27.12 | TODO | TODO | TODO |
| Standard no-selection / minimum result | £18.39 / £18.38 | TODO | TODO | TODO |
| Underlay leg stakes | £5.75 / £4.78 | TODO | TODO | TODO |

### Case MULTI-LAY-002

- Case ID: `MULTI-LAY-002`
- Calculator / offer: Multi-Lay Free Bet SNR
- Backing type: Free Bet (SNR)
- Simple/Advanced mode: Advanced
- Actual selected strategy: Standard, Underlay, Overlay, Custom 1.10×
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/calculators/multi-lay-calculator
- MBB URL: https://matchedbettingblog.com/multi-lay-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / odds / boost | £10 / 4.00 / 0% | TODO | TODO |
| Lay A odds / commission | 2.50 / 5% | TODO | TODO |
| Lay B odds / commission | 3.00 / 5% | TODO | TODO |
| Custom min / selected / max | source default / 1.10× / source default | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Standard lay stakes | £12.24 / £10.17 | TODO | TODO | TODO |
| Underlay lay stakes | £0.00 / £0.00 | TODO | TODO | TODO |
| Overlay lay stakes | £42.19 / £35.04 | TODO | TODO | TODO |
| Custom lay stakes / copied stakes | £13.47 / £11.19 | TODO | TODO | TODO |
| Custom outcomes | £23.43 / £20.42 / £20.42 | TODO | TODO | TODO |

### Case MULTI-LAY-003

- Case ID: `MULTI-LAY-003`
- Calculator / offer: Multi-Lay Money Back if bet loses
- Backing type: Normal cash backing bet with future refund
- Simple/Advanced mode: Advanced
- Actual selected strategy: Standard, Underlay, Overlay, Custom 1.10×
- Bonus trigger, where relevant: Back bet loses
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: N/A — current Outplayed UI does not expose Money Back
- MBB URL: https://matchedbettingblog.com/multi-lay-calculator/
- Notes / screenshot reference: Enter retained Cashback £7.00 at MBB; Plum Duff input is £10 reward × 70% retention. Leave observations TODO.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / odds / boost | £10 / 4.00 / 0% | N/A | TODO |
| Refund / retention | £10 / 70% | N/A | Cashback £7.00 |
| Lay A odds / commission | 2.50 / 5% | N/A | TODO |
| Lay B odds / commission | 3.00 / 5% | N/A | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Retained refund | £7.00 | TODO | N/A | TODO |
| Standard lay stakes / outcomes | £13.47/£11.19; £20.43/£20.42/£20.42 | TODO | N/A | TODO |
| Underlay lay stakes / outcomes | £1.73/£1.43; £0.00/£28.76/£28.78 | TODO | N/A | TODO |
| Overlay lay stakes / outcomes | £42.19/£35.04; £70.37/£0.00/£0.00 | TODO | N/A | TODO |
| Custom lay stakes / copied stakes | £14.82 / £12.31 | TODO | N/A | TODO |

### Case MULTI-LAY-004

- Case ID: `MULTI-LAY-004`
- Calculator / offer: Multi-Lay Profit Boost / varying commission / 3+ legs
- Backing type: Normal
- Simple/Advanced mode: Advanced
- Actual selected strategy: Standard then Custom 1.10×
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: N/A — current Outplayed UI does not expose boost/advanced custom
- MBB URL: https://matchedbettingblog.com/multi-lay-calculator/
- Notes / screenshot reference: Add further legs through 4 and optionally 20 to check control/persistence boundaries.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake / odds / Profit Boost | £10 / 4.00 / 10% | N/A | TODO |
| Lay A / B | 2.50 at 5%; 3.00 at 5% | N/A | TODO |
| Varying 3-leg repeat | 2.50 at 2%; 3.00 at 5%; 6.00 at 10% | N/A | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Effective back odds | 4.3000 | TODO | N/A | TODO |
| Boosted Standard stakes / outcomes | £17.55/£14.58; £20.52/£20.52/£20.51 | TODO | N/A | TODO |
| Varying-commission Custom stakes | £17.74 / £14.92 / £7.46 | TODO | N/A | TODO |
| Varying-commission outcomes | £28.27 / £24.27 / £24.26 / £24.26 | TODO | N/A | TODO |

### Case EACH-WAY-EXTRA-PLACE-001

- Case ID: `EACH-WAY-EXTRA-PLACE-001`
- Calculator / offer: Extra Place / Each Way
- Backing type: Each-way cash stake
- Simple/Advanced mode: Each Way, then Extra Place
- Actual selected strategy: Separate win/place lays
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/each-way-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| EW stake / back odds / terms | £10 / 6.00 / 1/5 | TODO | TODO |
| Bookmaker / exchange places | 4 / 4, then 4 / 3 | TODO | TODO |
| Win lay odds/commission | 2.30 / 0% | TODO | TODO |
| Place lay odds/commission | 4.50 / 0% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Win / place lay stake (£) | 26.09 / 4.44 | TODO | TODO | TODO |
| Each Way first/standard/unplaced outcomes (£) | 10.54 / 10.55 / 10.53 | TODO | TODO | TODO |
| Extra Place outcome (£) | 30.53 | TODO | TODO | TODO |

### Case SEQUENTIAL-LAY-001

- Case ID: `SEQUENTIAL-LAY-001`
- Calculator / offer: Sequential Lay
- Backing type: Normal
- Simple/Advanced mode: Standard, then Lock In
- Actual selected strategy: Sequential legs
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/sequential-lay-calculator/
- Notes / screenshot reference: Repeat 2, 3 and 4 legs with per-leg commission.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Stake / back odds | £10 / 9.00 | TODO | TODO |
| Lay legs / commissions | 2.50, 2.00, 1.50 / 5% each | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Standard lay stakes (£) | 10.53 / 27.15 / 55.73 | TODO | TODO | TODO |
| Standard all-win result (£) | 9.20 | TODO | TODO | TODO |
| Lock In final lay / locked result (£) | 62.07 / 6.02 | TODO | TODO | TODO |

### Case EARLY-PAYOUT-001

- Case ID: `EARLY-PAYOUT-001`
- Calculator / offer: Early Payout / 2UP
- Backing type: Exchange Lay; repeat 2-Way Dutch
- Simple/Advanced mode: Pre-trigger and triggered
- Actual selected strategy: Equalised; repeat slider endpoints/midpoint and part back
- Bonus trigger, where relevant: Bookmaker has paid early
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/early-payout-calculator/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Back stake/odds | £50 / 2.25 | TODO | TODO |
| Lay odds/commission | 2.32 / 5% | TODO | TODO |
| Trigger/in-play odds | On / 1.20 | TODO | TODO |
| Optional cap / part back | £80 / £20 at 1.40 | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Initial lay / liability (£) | 49.56 / 65.42 | TODO | TODO | TODO |
| Triggered additional back / equal result (£) | 95.82 / 16.24 | TODO | TODO | TODO |
| Cap additional back / result (£) | 68.73 / 10.83 | TODO | TODO | TODO |
| Part-back remaining / result (£) | 72.48 / 19.58 | TODO | TODO | TODO |

### Case ACCUMULATOR-001

- Case ID: `ACCUMULATOR-001`
- Calculator / offer: Multiples / Accumulator
- Backing type: Normal
- Simple/Advanced mode: Core accumulator
- Actual selected strategy: Winner/Void/Loser state sequence
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/bet-calculator/
- Notes / screenshot reference: Each Way, Rule 4 and bookmaker bonus remain optional blocked extensions.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Stake | £10 | TODO | TODO |
| Selections | 2.00 Winner; 3.00 Void; 1.50 Winner | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Combined/all-win odds | 9.0000 | TODO | TODO | TODO |
| Settled return / profit (£) | 30.00 / 20.00 | TODO | TODO | TODO |
| Any-loss profit (£) | -10.00 | TODO | TODO | TODO |

### Case DUTCHING-001

- Case ID: `DUTCHING-001`
- Calculator / offer: Dutching
- Backing type: Normal; repeat Free Bet SNR
- Simple/Advanced mode: Simple; Advanced remains blocked
- Actual selected strategy: 2-way and 3-way; penny/£1/£5/£10 rounding
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/dutching-calculator-guide
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| First stake / selection odds | £10 / 2.00, 3.00 | TODO | TODO |
| Commission / rounding | 0% / nearest penny | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Selection stakes (£) | 10.00 / 6.67 | TODO | TODO | TODO |
| Total stake / outcome profits (£) | 16.67 / 3.33, 3.34 | TODO | TODO | TODO |

## Utility and decision support

### Case ODDS-PROBABILITY-001

- Case ID: `ODDS-PROBABILITY-001`
- Calculator / offer: Odds / Probability
- Backing type: N/A
- Simple/Advanced mode: N/A
- Actual selected strategy: Fractional, Decimal, American, Probability source formats
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: https://matchedbettingblog.com/odds-converter/
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Fractional | 5/2 | TODO | TODO |
| Decimal | 3.75 | TODO | TODO |
| American | -140 | TODO | TODO |
| Probability | 62.5% | TODO | TODO |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| 5/2 decimal / probability | 3.50 / 28.57% | TODO | TODO | TODO |
| 3.75 fractional / American | 11/4 / +275 | TODO | TODO | TODO |
| -140 decimal / probability | 1.71 / 58.33% | TODO | TODO | TODO |
| 62.5% decimal / fractional | 1.60 / 3/5 | TODO | TODO | TODO |

### Case BLACKJACK-001

- Case ID: `BLACKJACK-001`
- Calculator / offer: Blackjack Strategy
- Backing type: N/A
- Simple/Advanced mode: H17/S17 and surrender rule combinations
- Actual selected strategy: recommendation plus published fallback
- Bonus trigger, where relevant: N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: https://outplayed.com/blackjack-strategy-calculator
- MBB URL: N/A — no equivalent used
- Notes / screenshot reference: Enter only dealer up-card and visible player ranks.

| Input | Platform | Outplayed | MBB |
|---|---|---|---|
| Dealer / player / Dealer hits Soft 17 / surrender allowed | 9 / 6,5 / No / No | TODO | N/A |
| Dealer / player / surrender | 10 / 10,5 / allowed | TODO | N/A |
| Soft hand | 6 / A,7 / S17 | TODO | N/A |
| Pair | 7 / 8,8 / S17 | TODO | N/A |
| Hit continuation | 10 / 10,2 then 5 | TODO | N/A |

| Output | Independent expected | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|---|
| Hard 11 recommendation/fallback | Double / Hit | TODO | TODO | N/A |
| Hard 15 surrender/fallback | Surrender / Hit | TODO | TODO | N/A |
| Soft 18 | Double / Stand | TODO | TODO | N/A |
| Pair 8s | Split | TODO | TODO | N/A |
| Continued hard 17 | Stand | TODO | TODO | N/A |

## Copy this block to add a case

### Case `CASE-ID-TODO`

- Case ID: `CASE-ID-TODO`
- Calculator / offer: TODO
- Backing type: TODO
- Simple/Advanced mode: TODO
- Actual selected strategy: TODO
- Bonus trigger, where relevant: TODO / N/A
- Platform commit: TODO
- Test date: TODO
- Outplayed URL: TODO
- MBB URL: TODO
- Notes / screenshot reference: TODO

| Input | Platform | Outplayed | MBB |
|---|---|---|---|---|
| TODO | TODO | TODO | TODO | TODO |

Independent expected result and equation: TODO (keep separate from observations).

| Output | Platform observed | Outplayed observed | MBB observed |
|---|---|---|---|
| TODO | TODO | TODO | TODO |
