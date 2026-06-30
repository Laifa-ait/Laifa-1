/**
 * Calculates linguistic similarity between two product names.
 * Returns true if they are considered duplicates based on direct match, inclusion,
 * or overlapping keywords of length > 3.
 */
export function areProductNamesSimilar(name1: string, name2: string): boolean {
  const n1 = (name1 || "").toLowerCase().trim();
  const n2 = (name2 || "").toLowerCase().trim();

  if (n1.length < 3 || n2.length < 3) return false;

  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const words1 = n1.split(/\s+/).filter((w) => w.length > 3);
  const words2 = n2.split(/\s+/).filter((w) => w.length > 3);
  const common = words1.filter((w) => words2.includes(w));

  return common.length >= 2; // high similarity if 2 or more keywords match
}
