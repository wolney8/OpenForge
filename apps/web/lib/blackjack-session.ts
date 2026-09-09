const MONEY_INPUT = /^[0-9]+(?:\.[0-9]{1,2})?$/;

export function parseBlackjackStakePence(value: string): bigint | null {
  if (!MONEY_INPUT.test(value)) return null;
  const [pounds, fraction = ""] = value.split(".");
  const pence = (BigInt(pounds) * BigInt(100)) + BigInt(fraction.padEnd(2, "0"));
  return pence >= BigInt(0) ? pence : null;
}

export function formatBlackjackStakePence(pence: bigint): string {
  const pounds = pence / BigInt(100);
  return `${pounds}.${String(pence % BigInt(100)).padStart(2, "0")}`;
}

export function multiplyBlackjackStake(value: string, multiplier: number): string | null {
  const pence = parseBlackjackStakePence(value);
  if (pence === null || !Number.isSafeInteger(multiplier) || multiplier < 0) return null;
  return formatBlackjackStakePence(pence * BigInt(multiplier));
}

export function splitBlackjackStakeExactly(value: string): string | null {
  const pence = parseBlackjackStakePence(value);
  if (pence === null) return null;
  const halfPence = pence / BigInt(2);
  if (pence % BigInt(2) === BigInt(0)) return formatBlackjackStakePence(halfPence);
  const thousandths = halfPence * BigInt(10) + BigInt(5);
  return `${thousandths / BigInt(1000)}.${String(thousandths % BigInt(1000)).padStart(3, "0")}`;
}
