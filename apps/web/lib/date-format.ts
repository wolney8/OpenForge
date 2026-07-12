export function toDateInputValue(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return normalized.slice(0, 10);
}

export function toDateTimeLocalValue(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return normalized.slice(0, 16);
}

export function fromDateInputValue(value: string): string {
  return value.trim();
}

export function fromDateTimeLocalValue(value: string): string {
  return value.trim() ? value.replace("T", " ") : "";
}
