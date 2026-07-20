"use client";

type MaterialDateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dataPdId?: string;
};

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

export function MaterialDateTimeField({
  label,
  value,
  onChange,
  dataPdId,
}: MaterialDateTimeFieldProps) {
  const { date, time } = splitDateTime(value);

  const updateDate = (nextDate: string) => {
    onChange(nextDate ? `${nextDate}T${time || "00:00"}` : "");
  };

  const updateTime = (nextTime: string) => {
    if (!date) return;
    onChange(`${date}T${nextTime || "00:00"}`);
  };

  return (
    <fieldset className="material-date-time-field" data-pd-id={dataPdId}>
      <legend>{label}</legend>
      <label className="material-date-time-control">
        <span aria-hidden="true" className="material-symbols-outlined">event</span>
        <span className="visually-hidden">{label} date</span>
        <input onChange={(event) => updateDate(event.target.value)} type="date" value={date} />
      </label>
      <label className="material-date-time-control">
        <span aria-hidden="true" className="material-symbols-outlined">schedule</span>
        <span className="visually-hidden">{label} time</span>
        <input disabled={!date} onChange={(event) => updateTime(event.target.value)} type="time" value={time} />
      </label>
    </fieldset>
  );
}
