"use client";

import { useState } from "react";
import { formatFinancialValue } from "@/lib/financial-display";
import styles from "./design-lab-report-chart.module.css";

type Point = { id: string; date: string; value: number };
type ChartType = "Bar" | "Stacked Bar" | "Line" | "Candlestick";

export function DesignLabReportChart({ points, onOpen }: { points: Point[]; onOpen: (id:string) => void }) {
  const [type, setType] = useState<ChartType>("Bar");
  const max = Math.max(1, ...points.map(point => Math.abs(point.value)));
  const coords = points.map((point,index) => `${points.length === 1 ? 50 : 5 + index * 90 / (points.length - 1)},${50 - point.value / max * 42}`).join(" ");
  return <section className={styles.panel} data-pd-id="lab.report-chart">
    <div className={styles.head}><h2>Performance</h2><div aria-label="Chart Type" className={styles.types} role="radiogroup">{(["Bar","Stacked Bar","Line","Candlestick"] as ChartType[]).map(item => <button aria-checked={type === item} data-chart-type={item} disabled={item === "Stacked Bar" || item === "Candlestick"} key={item} onClick={() => setType(item)} onKeyDown={event => { if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key)) return; event.preventDefault(); const next:ChartType = event.key === "Home" ? "Bar" : event.key === "End" ? "Line" : type === "Bar" ? "Line" : "Bar"; setType(next); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-chart-type="${next}"]`)?.focus(); }} role="radio" tabIndex={type === item ? 0 : -1} title={item === "Stacked Bar" ? "Distinct validated component series unavailable" : item === "Candlestick" ? "Governed Open, High, Low, Close series unavailable" : undefined} type="button">{item}</button>)}</div></div>
    <p className={styles.reason}>Stacked Bar requires distinct validated component series. Candlestick requires governed Open, High, Low and Close values.</p>
    {type === "Line" ? <div className={styles.lineWrap}><svg aria-label="Line chart of the same settled source values" preserveAspectRatio="none" role="img" viewBox="0 0 100 100"><line className={styles.zero} x1="0" x2="100" y1="50" y2="50"/><polyline className={styles.line} fill="none" points={coords}/>{points.map((point,index) => <circle className={point.value < 0 ? styles.negativeDot : styles.positiveDot} cx={points.length === 1 ? 50 : 5 + index * 90 / (points.length - 1)} cy={50 - point.value / max * 42} key={point.id} r="1.5"/>)}</svg></div> : <div aria-label="Bar chart of settled source values" className={styles.bars} role="img">{points.map(point => <div className={styles.barColumn} key={point.id}><span className={styles.barZero}/><span className={point.value < 0 ? styles.negativeBar : styles.positiveBar} style={{height:`${Math.abs(point.value)/max*42}%`,top:point.value < 0 ? "50%" : `${50-Math.abs(point.value)/max*42}%`}}/></div>)}</div>}
    <div className={styles.pointLinks}>{points.map(point => <button aria-label={`Open ${point.date} source record, ${formatFinancialValue(point.value)}`} key={point.id} onClick={() => onOpen(point.id)} type="button"><span>{point.date}</span><strong>{formatFinancialValue(point.value)}</strong></button>)}</div>
    <details><summary>View Chart Data</summary><table><caption>Settled source values; unknown is never zero</caption><thead><tr><th scope="col">Date</th><th scope="col">Value</th><th scope="col">Source</th></tr></thead><tbody>{points.map(point => <tr key={point.id}><td>{point.date}</td><td>{formatFinancialValue(point.value)}</td><td><button onClick={() => onOpen(point.id)} type="button">{point.id}</button></td></tr>)}</tbody></table></details>
  </section>;
}
