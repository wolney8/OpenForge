"use client";

import { DesignLabSelect } from "@/components/design-lab-select";
import styles from "@/components/design-lab-connected.module.css";

type OfferDetailsValue = { offerType: string; betType: string; fixtureType: string };

/** Shared Lab/real grouped presentation; each adapter owns its draft and Save. */
export function DesignOfferDetailsCellFields({ dataPdId, value, offerTypes, betTypes, fixtureTypes, onOfferTypeChange, onBetTypeChange, onFixtureTypeChange }: {
  dataPdId: string;
  value: OfferDetailsValue;
  offerTypes: string[];
  betTypes: string[];
  fixtureTypes: string[];
  onOfferTypeChange: (value: string) => void;
  onBetTypeChange: (value: string) => void;
  onFixtureTypeChange: (value: string) => void;
}) {
  return <div className="ledger-floating-composite" data-pd-id={dataPdId}>
    <DesignLabSelect cellSized initialFocus dataPdId={`${dataPdId}.offer-type`} label="Offer Type" onChange={onOfferTypeChange} options={[{ value: "", label: "Select offer type" }, ...offerTypes.map(option => ({ value: option, label: option }))]} value={value.offerType} />
    <DesignLabSelect cellSized dataPdId={`${dataPdId}.bet-type`} label="Bet Type" onChange={onBetTypeChange} options={[{ value: "", label: "Select bet type" }, ...betTypes.map(option => ({ value: option, label: option }))]} value={value.betType} />
    <DesignLabSelect cellSized dataPdId={`${dataPdId}.fixture-type`} label="Fixture Type" onChange={onFixtureTypeChange} options={[{ value: "", label: "Select fixture type" }, ...fixtureTypes.map(option => ({ value: option, label: option }))]} value={value.fixtureType} />
    <button className={styles.secondaryButton} type="submit">Apply offer details</button>
  </div>;
}
