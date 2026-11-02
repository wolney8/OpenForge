"use client";

import { useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { labLedgerColumns, labRecordInputs, type LabLedgerKey, type LabRecord } from "@/lib/design-lab-connected-data";
import { cashAdjustmentDirectionOptions, cashAdjustmentTypeOptions, casinoOfferTypeOptions, freeBetRetentionModeOptions, freeBetStatusOptions } from "@/lib/workbook-options";
import styles from "./design-lab-specialist-concept.module.css";

type Specialist = Extract<LabLedgerKey,"freeBets"|"casino"|"extraPlace"|"cash">;
type Field = { label:string; kind?:"date"|"money"|"number"|"text"; options?:readonly string[] };
const stages:Record<Specialist,string[]> = {
  freeBets:["Award Review","Back / Lay Preparation","Placement","Settlement"],
  casino:["Setup","Wagering","Reward","Settlement"],
  extraPlace:["Calculate & Place","Settlement"], cash:["Adjustment"],
};
const fields:Record<Specialist,Record<string,Field[]>> = {
  freeBets:{"Award Review":[{label:"Qualifying Source"},{label:"Offer Name"},{label:"Event Name"},{label:"Offer Details"},{label:"Award Status",options:freeBetStatusOptions},{label:"Free Bet Type",options:freeBetRetentionModeOptions},{label:"Expiry",kind:"date"}],"Back / Lay Preparation":[{label:"Bookmaker"},{label:"Back Stake",kind:"money"},{label:"Back Odds",kind:"number"},{label:"Exchange"},{label:"Lay Odds",kind:"number"}],Placement:[{label:"External Back Confirmation",options:["Not Confirmed","Confirmed Externally"]},{label:"External Lay Confirmation",options:["Not Confirmed","Partially Matched","Fully Matched"]}],Settlement:[{label:"Result",options:["Unsettled","Back Wins","Lay Wins","Void"]}]},
  casino:{Setup:[{label:"Offer Name"},{label:"Bookmaker"},{label:"Game"},{label:"Offer Type",options:casinoOfferTypeOptions},{label:"Expiry",kind:"date"}],Wagering:[{label:"Own Cash Wagered",kind:"money"},{label:"Bonus Credit",kind:"money"},{label:"Wagering Requirement",kind:"money"}],Reward:[{label:"Reward Type"},{label:"Converted Reward",kind:"money"}],Settlement:[{label:"Final Result",options:["Pending","Settled","Void"]}]},
  extraPlace:{"Calculate & Place":[{label:"Date / Time",kind:"date"},{label:"Runner / Race"},{label:"Bookmaker"},{label:"E/W Stake",kind:"money"},{label:"Back Odds",kind:"number"},{label:"Back Terms",options:["1/4","1/5","1/6"]},{label:"Bookmaker Places",kind:"number"},{label:"Exchange Places",kind:"number"},{label:"Win Lay Odds",kind:"number"},{label:"Win Lay Stake",kind:"money"},{label:"Place Lay Odds",kind:"number"},{label:"Place Lay Stake",kind:"money"}],Settlement:[{label:"Win Result",options:["Pending","Won","Lost","Void"]},{label:"Place Result",options:["Pending","Placed","Not Placed","Extra Place","Void"]}]},
  cash:{Adjustment:[{label:"Direction",options:cashAdjustmentDirectionOptions},{label:"Type",options:cashAdjustmentTypeOptions},{label:"Amount",kind:"money"},{label:"Investment",options:["Yes","No"]},{label:"Cash Snapshot",options:["Yes","No"]},{label:"Linked Profile"},{label:"Linked Account"},{label:"Date",kind:"date"},{label:"Reason"}]},
};
const sourceKeys: Record<Specialist,Record<string,string>> = {
  freeBets:{"Qualifying Source":"qualifying_source","Offer Name":"offer_name","Event Name":"event_name","Offer Details":"offer_details","Award Status":"status","Free Bet Type":"match_strategy","Expiry":"expiry_datetime","Bookmaker":"bookmaker","Back Stake":"back_stake","Back Odds":"back_odds","Exchange":"exchange","Lay Odds":"lay_odds"},
  casino:{"Offer Name":"offer_name","Bookmaker":"bookmaker","Game":"game","Offer Type":"offer_type","Expiry":"expiry_datetime","Own Cash Wagered":"own_cash_wagered","Bonus Credit":"bonus_credit","Wagering Requirement":"wagering_requirement","Reward Type":"reward_type","Converted Reward":"converted_reward"},
  extraPlace:{"Date / Time":"date","Runner / Race":"runner","Bookmaker":"bookmaker","E/W Stake":"stake","Back Odds":"backOdds","Back Terms":"terms","Bookmaker Places":"bookmaker_places","Exchange Places":"exchange_places","Win Lay Odds":"winLayOdds","Win Lay Stake":"winLayStake","Place Lay Odds":"placeLayOdds","Place Lay Stake":"placeLayStake"},
  cash:{"Direction":"direction","Type":"adjustment_type","Amount":"amount","Investment":"affects_investment","Cash Snapshot":"affects_cash_snapshot","Linked Profile":"profile_id","Linked Account":"linked_account","Date":"adjustment_date","Reason":"description"},
};
const descriptive:Record<Specialist,string[]>={freeBets:["Offer Name","Event Name","Offer Details"],casino:["Offer Name","Game"],extraPlace:["Runner / Race"],cash:["Reason"]};
function initialValues(section:Specialist,source:LabRecord|null,overrides:Record<string,string>) {
  if(!source) return {};
  const raw={...labRecordInputs[source.id],...source.sourceInputs,...overrides};
  const values:Record<string,string>={};
  for(const [label,key] of Object.entries(sourceKeys[section])) values[label]=key==="status"?source.status:raw[key]??"";
  if(section==="freeBets") {values["Offer Name"]=raw.offer_name??"";values["Event Name"]=raw.event_name??"";values["Offer Details"]=raw.offer_details??"";values["Qualifying Source"]=source.relatedId??"";}
  if(section==="cash") values["Linked Profile"]=source.profileId;
  return values;
}

export function DesignLabSpecialistConcept({ section, source, sourceOverrides, onPreviewSave, onClose }: { section:Specialist; source:LabRecord|null; sourceOverrides:Record<string,string>; onPreviewSave:(source:LabRecord,fields:Record<string,string>)=>{outcome:string;message?:string}; onClose:()=>void }) {
  const [stage,setStage]=useState(stages[section][0]);
  const [values,setValues]=useState<Record<string,string>>(()=>initialValues(section,source,sourceOverrides));
  const [offerType,setOfferType]=useState(()=>initialValues(section,source,sourceOverrides)["Offer Type"]||"Free Spins");
  const [error,setError]=useState("");
  const initial=initialValues(section,source,sourceOverrides);
  const changed=Object.keys(values).filter(label=>values[label]!==initial[label]);
  const descriptiveOnly=changed.length>0&&changed.every(label=>descriptive[section].includes(label));
  const availableStages=section === "casino" ? stages.casino.filter(item => item === "Setup" || item === "Settlement" || (item === "Wagering" && /Wager|Deposit/.test(offerType)) || (item === "Reward" && !/Free Spins/.test(offerType))) : stages[section];
  const shownStage=availableStages.includes(stage) ? stage : availableStages[0];
  const fieldList=fields[section][shownStage] ?? [];
  return <section aria-label={`${section} Add/Edit concept`} className={styles.concept} data-pd-id={`lab.concept.${section}`}>
    <header className={styles.head}><div><strong className={styles.preview}>Preview Only</strong>{source ? <p>{source.id} · {source.title}</p> : null}</div><button onClick={onClose} type="button">Return to Ledger</button></header>
    {availableStages.length > 1 ? <nav aria-label="Concept sections" className={styles.stages}>{availableStages.map(item => <button aria-current={shownStage === item ? "step" : undefined} key={item} onClick={() => setStage(item)} type="button">{item}</button>)}</nav> : null}
    <div className={styles.columns}><div className={styles.card}><h2>{shownStage}</h2><div className={styles.fields}>{fieldList.map(field => field.options ? <DesignLabSelect dataPdId={`lab.concept-field.${section}.${field.label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} key={field.label} label={field.label} onChange={value => {setValues(current => ({...current,[field.label]:value}));if(field.label === "Offer Type") setOfferType(value);}} options={[{value:"",label:"Not Recorded"},...(values[field.label] && !field.options.includes(values[field.label]) ? [{value:values[field.label],label:`${values[field.label]} · Recorded`}] : []),...field.options.map(option => ({value:option,label:option}))]} value={values[field.label] ?? ""}/> : <label key={field.label}>{field.label}<input inputMode={field.kind === "money" || field.kind === "number" ? "decimal" : undefined} onChange={event => setValues(current => ({...current,[field.label]:event.target.value}))} type={field.kind === "date" ? values[field.label]?.includes("T") ? "datetime-local" : "date" : "text"} value={values[field.label] ?? ""}/></label>)}</div></div><aside className={styles.card}><h2>Source &amp; Financial Meaning</h2><p>{section === "freeBets" ? "A qualifying bet does not automatically award a Free Bet. Review the award before availability; SNR and SR remain distinct." : section === "casino" ? "Own cash, bonus credit, converted reward and realised P&L are separate values." : section === "extraPlace" ? "Win and place Lay positions, bookmaker and exchange place terms, and extra-place outcomes remain separate." : "Moving cash is not betting profit. Observation, source and audit history must remain traceable."}</p><p>Calculated outcomes: Unavailable · no validated fixture for this edited concept.</p>{source?.relatedId ? <p>Linked source: {source.relatedId}</p> : null}{section === "cash" ? <><p>Source: {source?.id ?? "New draft · no source record yet"}</p><p>Audit History: {source ? "Unavailable · governed history fixture not loaded" : "No entries before a governed save"}</p></> : null}</aside></div>
    <details className={styles.columnsMap}><summary>Required Ledger Columns · Preserved</summary><ol>{labLedgerColumns[section].map(column => <li key={column}>{column}</li>)}</ol></details>
    {error?<p role="alert">{error}</p>:null}<div className={styles.actions}><button onClick={onClose} type="button">Cancel</button>{descriptiveOnly&&source?<button onClick={()=>{const patch=Object.fromEntries(changed.map(label=>[sourceKeys[section][label],values[label].trim()]));const result=onPreviewSave(source,patch);if(result.outcome!=="APPLIED"&&result.outcome!=="UNCHANGED")setError(result.message??"This change requires source review.");}} type="button">Save Descriptive Preview</button>:<button disabled title="Financial and lifecycle saves require governed fixtures and audit" type="button">Financial Save Unavailable · Preview</button>}</div>
  </section>;
}
