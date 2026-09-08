# Sequential Lay calculation fixture specification

Fixtures pin the current live source calculator's observable directional-rounding behaviour. Required cases cover the 3-leg Standard and Lock In examples, the qualifying double, a rounding-sensitive non-default case, varying per-leg/back commission, and more than three legs. Tests also cover malformed odds, minimum leg count, dynamic add/remove, reset, stale auto-calculation and zero business writes.

The public guide values marked “about” are contextual evidence. Exact expected pennies come from the current live calculator and its versioned implementation.
