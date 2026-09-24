/** Keep fixed/resizable table columns large enough for complete read-only accounting text.
 * ch and rem track enlarged text; the existing pixel width remains the user's preference.
 */
export function financialColumnWidth(preferredPixels: number, formattedValues: string[], minimumRem = 0): string {
  const characters = formattedValues.reduce((longest, value) => Math.max(longest, value.length), 5);
  return `max(${preferredPixels}px, ${minimumRem}rem, calc(${characters}ch + 4rem))`;
}
