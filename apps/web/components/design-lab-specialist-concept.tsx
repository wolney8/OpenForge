"use client";

import { useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { labLedgerColumns, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import styles from "./design-lab-specialist-concept.module.css";

type Specialist = Extract<LabLedgerKey,"freeBets"|"casino"|"extraPlace"|"cash">;
type Field = { label:string; kind?:"date"|"money"|"number"|"text"; options?:string[] };
const stages:Record<Specialist,string[]> = {
  freeBets:["Award Review","Back / Lay Preparation","Placement","Settlement"],
  casino:["Setup","Wagering","Reward","Settlement"],
  extraPlace:["Calculate & Place","Settlement"], cash:["Adjustment"],
};
const fields:Record<Specialist,Record<string,Field[]>> = {
  freeBets:{"Award Review":[{label:"Qualifying Source"},{label:"Award Status",options:["Prospecting","Available"]},{label:"Free Bet Type",options:["SNR","SR"]},{label:"Expiry",kind:"date"}],"Back / Lay Preparation":[{label:"Bookmaker"},{label:"Back Stake",kind:"money"},{label:"Back Odds",kind:"number"},{label:"Exchange"},{label:"Lay Odds",kind:"number"}],Placement:[{label:"External Back Confirmation",options:["Not Confirmed","Confirmed Externally"]},{label:"External Lay Confirmation",options:["Not Confirmed","Partially Matched","Fully Matched"]}],Settlement:[{label:"Result",options:["Unsettled","Back Wins","Lay Wins","Void"]}]},
  casino:{Setup:[{label:"Offer Name"},{label:"Bookmaker"},{label:"Offer Type",options:["Free Spins","Fixed Spins / Free Play","Wager to Earn Reward","Deposit and Bonus Wagering"]},{label:"Expiry",kind:"date"}],Wagering:[{label:"Own Cash Wagered",kind:"money"},{label:"Bonus Credit",kind:"money"},{label:"Wagering Requirement",kind:"money"}],Reward:[{label:"Reward Type"},{label:"Converted Reward",kind:"money"}],Settlement:[{label:"Final Result",options:["Pending","Settled","Void"]}]},
  extraPlace:{"Calculate & Place":[{label:"Runner / Race"},{label:"Bookmaker"},{label:"E/W Stake",kind:"money"},{label:"Back Odds",kind:"number"},{label:"Back Terms"},{label:"Bookmaker Places",kind:"number"},{label:"Exchange Places",kind:"number"},{label:"Win Lay Odds",kind:"number"},{label:"Win Lay Stake",kind:"money"},{label:"Place Lay Odds",kind:"number"},{label:"Place Lay Stake",kind:"money"}],Settlement:[{label:"Win Result",options:["Pending","Won","Lost","Void"]},{label:"Place Result",options:["Pending","Placed","Not Placed","Extra Place","Void"]}]},
  cash:{Adjustment:[{label:"Direction",options:["In","Out"]},{label:"Type"},{label:"Amount",kind:"money"},{label:"Linked Profile"},{label:"Linked Account"},{label:"Date",kind:"date"},{label:"Reason"}]},
};

export function DesignLabSpecialistConcept({ section, source, onClose }: { section:Specialist; source:LabRecord|null; onClose:()=>void }) {
  const [stage,setStage]=useState(stages[section][0]);
  const [values,setValues]=useState<Record<string,string>>({});
  const [offerType,setOfferType]=useState("Free Spins");
  const availableStages=section === "casino" ? stages.casino.filter(item => item === "Setup" || item === "Settlement" || (item === "Wagering" && /Wager|Deposit/.test(offerType)) || (item === "Reward" && !/Free Spins/.test(offerType))) : stages[section];
  const shownStage=availableStages.includes(stage) ? stage : availableStages[0];
  const fieldList=fields[section][shownStage] ?? [];
  return <section aria-label={`${section} Add/Edit concept`} className={styles.concept} data-pd-id={`lab.concept.${section}`}>
    <header className={styles.head}><div><strong className={styles.preview}>Preview Only</strong>{source ? <p>{source.id} · {source.title}</p> : null}</div><button onClick={onClose} type="button">Return to Ledger</button></header>
    {availableStages.length > 1 ? <nav aria-label="Concept sections" className={styles.stages}>{availableStages.map(item => <button aria-current={shownStage === item ? "step" : undefined} key={item} onClick={() => setStage(item)} type="button">{item}</button>)}</nav> : null}
    <div className={styles.columns}><div className={styles.card}><h2>{shownStage}</h2><div className={styles.fields}>{fieldList.map(field => field.options ? <DesignLabSelect dataPdId={`lab.concept-field.${section}.${field.label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} key={field.label} label={field.label} onChange={value => {setValues(current => ({...current,[field.label]:value}));if(field.label === "Offer Type") setOfferType(value);}} options={field.options.map(option => ({value:option,label:option}))} value={values[field.label] ?? (field.label === "Offer Type" ? offerType : field.options[0])}/> : <label key={field.label}>{field.label}<input inputMode={field.kind === "money" || field.kind === "number" ? "decimal" : undefined} onChange={event => setValues(current => ({...current,[field.label]:event.target.value}))} type={field.kind === "date" ? "date" : "text"} value={values[field.label] ?? ""}/></label>)}</div></div><aside className={styles.card}><h2>Source &amp; Financial Meaning</h2><p>{section === "freeBets" ? "A qualifying bet does not automatically award a Free Bet. Review the award before availability; SNR and SR remain distinct." : section === "casino" ? "Own cash, bonus credit, converted reward and realised P&L are separate values." : section === "extraPlace" ? "Win and place Lay positions, bookmaker and exchange place terms, and extra-place outcomes remain separate." : "Moving cash is not betting profit. Observation, source and audit history must remain traceable."}</p><p>Calculated outcomes: Unavailable · no validated fixture for this edited concept.</p>{source?.relatedId ? <p>Linked source: {source.relatedId}</p> : null}{section === "cash" ? <><p>Source: {source?.id ?? "New draft · no source record yet"}</p><p>Audit History: {source ? "Unavailable · governed history fixture not loaded" : "No entries before a governed save"}</p></> : null}</aside></div>
    <details className={styles.columnsMap}><summary>Required Ledger Columns · Preserved</summary><ol>{labLedgerColumns[section].map(column => <li key={column}>{column}</li>)}</ol></details>
    <div className={styles.actions}><button onClick={onClose} type="button">Cancel</button><button disabled title="Concept only; no governed save or financial calculation is simulated" type="button">Save Unavailable · Preview</button></div>
  </section>;
}
