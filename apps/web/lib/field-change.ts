export function isOnlyFieldChange<T extends object>(
  current: T,
  pristine: T,
  allowedFields: ReadonlySet<keyof T>,
): boolean {
  let hasAllowedChange = false;

  for (const key of Object.keys(current) as Array<keyof T>) {
    if (Object.is(current[key], pristine[key])) continue;
    if (!allowedFields.has(key)) return false;
    hasAllowedChange = true;
  }

  return hasAllowedChange;
}
