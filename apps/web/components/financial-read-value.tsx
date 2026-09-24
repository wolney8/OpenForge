"use client";

import type { ComponentProps } from "react";
import { FinancialValue } from "@/components/financial-value";

export type FinancialReadState = { profileId: string; state: "loading" | "ready" | "error" } | null;

/** Read readiness is separate from the authoritative value, including zero/unknown. */
export function FinancialReadValue({ state, subject, ...props }: ComponentProps<typeof FinancialValue> & {
  state: "loading" | "ready" | "error"; subject: string;
}) {
  return state === "ready" ? <FinancialValue {...props} /> :
    <span>{state === "loading" ? `Loading ${subject}…` : `${subject} unavailable`}</span>;
}
