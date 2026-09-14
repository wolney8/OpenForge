"use client";
import type {InputHTMLAttributes} from "react";
import {commissionRatioToPercentage, percentageToCommissionRatio} from "@/lib/commission-input";
/** Existing input geometry; only the explicitly contracted presentation unit changes. */
export function CommissionInput({value, onRatioChange, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {value: string; onRatioChange: (ratio: string) => void}) {
  return <input {...props} inputMode="decimal" type="text" value={commissionRatioToPercentage(value)} onChange={event => onRatioChange(percentageToCommissionRatio(event.target.value))} />;
}
