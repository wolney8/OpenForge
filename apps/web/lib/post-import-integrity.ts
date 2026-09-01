export function isPostImportIntegrityCheckPassed(
  check: string,
  persistedValue: boolean,
): boolean {
  return check === "silent_partial_writes" ? !persistedValue : persistedValue;
}
