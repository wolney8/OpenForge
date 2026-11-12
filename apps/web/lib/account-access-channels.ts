/** The existing Profile Account access choices, shared by native and combined editors. */
export const accountAccessChannelOptions = ["Online", "Mobile", "Retail", "Unknown"].map(value => ({ id: value, name: value }));

export function normalizeAccountAccessChannels(values: string[]): string[] {
  if (values.some(value => !accountAccessChannelOptions.some(option => option.id === value))) throw new Error("Choose a supported Account access channel.");
  const selected = accountAccessChannelOptions.map(option => option.id).filter(value => values.includes(value));
  if (selected.includes("Unknown") && selected.length > 1) throw new Error("Unknown cannot be combined with another access channel.");
  return selected;
}
