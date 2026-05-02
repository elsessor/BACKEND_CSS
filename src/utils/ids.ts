export function createApplicationId(now = new Date()): string {
  return `CSS-${now.getUTCFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
}

export function createEquivalencyId(now = new Date()): string {
  return `EQ-${now.getUTCFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
}

export function createAuditId(now = new Date()): string {
  return `AUD-${now.getUTCFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
}
