import { normalizeMoneyInput } from "./decimal-input";

export type AccountMoneyIssue = { accountId: string; accountName: string; field: string; reason: string };
type AccountMoneySource = { account_id: string; account: string; current_balance: string; pending_withdrawal_amount: string };
export function accountMoneyError(raw: string): string | undefined {
  const canonical=normalizeMoneyInput(raw.trim(), {allowNegative:true});
  return canonical === null || canonical.length > 40 || raw.length > 40
    ? "Enter finite money with a full stop and at most two decimal places." : undefined;
}
export function normalizeAccountMoney(raw: string): string {
  return accountMoneyError(raw) ? raw : normalizeMoneyInput(raw.trim(), {allowNegative:true}) ?? raw;
}
export function accountMoneyDisplayValue(raw: string): string {
  if (!raw.trim() || accountMoneyError(raw)) return "Unavailable";
  const canonical=normalizeAccountMoney(raw);
  return Number.isFinite(Number(canonical)) && Number(canonical).toFixed(2)===canonical
    ? canonical : "Unavailable";
}
export function sumAccountMoney(rows: AccountMoneySource[], field: "current_balance" | "pending_withdrawal_amount") {
  let cents=BigInt(0);
  const issues: AccountMoneyIssue[]=[];
  for(const row of rows) {
    const raw=row[field];const text=typeof raw === "string" ? normalizeAccountMoney(raw) : "";
    if(typeof raw !== "string" || !text || accountMoneyError(raw)) {
      issues.push({accountId:row.account_id,accountName:row.account,field,reason:typeof raw !== "string" || !raw.trim() ? "Unknown amount" : "Invalid amount"});continue;
    }
    const negative=text.startsWith("-");const [whole,fraction]=text.replace(/^-/u,"").split(".");
    cents+=(negative ? BigInt(-1) : BigInt(1))*BigInt(whole+fraction);
  }
  const magnitude=cents<BigInt(0)?-cents:cents;
  const knownSubtotal=`${cents<BigInt(0)?"-":""}${magnitude/BigInt(100)}.${String(magnitude%BigInt(100)).padStart(2,"0")}`;
  const safe=cents<=BigInt(Number.MAX_SAFE_INTEGER)&&cents>=-BigInt(Number.MAX_SAFE_INTEGER)
    && (Number(cents)/100).toFixed(2)===knownSubtotal;
  if(!safe)issues.push({accountId:"aggregate",accountName:"Account total",field,reason:"Outside exact numeric display range"});
  return {value:issues.length?Number.NaN:Number(cents)/100,knownSubtotal:safe?knownSubtotal:"Unavailable",issues};
}
