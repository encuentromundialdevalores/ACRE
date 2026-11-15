import { db } from "@/lib/db";
import { propertyData } from "@/lib/db/schema";
import { toDatum, type ManualEntry } from "@/lib/manual-schema";

export { MANUAL_FIELDS, manualEntrySchema, type ManualEntry } from "@/lib/manual-schema";

export async function saveManualEntry(propertyId: string, userId: string, userName: string, e: ManualEntry) {
  const { value, valueJson } = toDatum(e);
  const row = {
    propertyId, fieldKey: e.fieldKey, value, valueJson, unit: null,
    source: `Captura manual · ${e.source}`, sourceUrl: e.sourceUrl || null,
    method: `Capturado a mano por ${userName} al no obtenerse de la fuente automática.`,
    consultedAt: new Date(), verificationStatus: "CONFIRMADO" as const, isDemo: false, isManual: true, enteredBy: userId,
    notes: e.notes || null,
  };
  const [saved] = await db.insert(propertyData).values(row)
    .onConflictDoUpdate({ target: [propertyData.propertyId, propertyData.fieldKey], set: row }).returning();
  return saved;
}
