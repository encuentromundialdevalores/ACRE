import {
  pgTable, pgEnum, uuid, text, timestamp, numeric, jsonb, boolean, integer, bigint, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("user_role", ["ADMIN", "OWNER", "BUYER"]);
export const verificationEnum = pgEnum("verification_status", ["CONFIRMADO", "PENDIENTE", "NO_DISPONIBLE"]);
export const dataModeEnum = pgEnum("data_mode", ["REAL", "DEMO"]);
export const documentKindEnum = pgEnum("document_kind", ["FOTO", "DOCUMENTO"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("OWNER"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  address: text("address"),
  neighborhood: text("neighborhood"),
  municipality: text("municipality"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  polygonGeojson: jsonb("polygon_geojson"),
  areaM2: numeric("area_m2", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("properties_owner_idx").on(t.ownerId)]);

export const propertyData = pgTable("property_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  fieldKey: text("field_key").notNull(),
  value: text("value"),
  valueJson: jsonb("value_json"),
  unit: text("unit"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  method: text("method"),
  consultedAt: timestamp("consulted_at", { withTimezone: true }).notNull().defaultNow(),
  verificationStatus: verificationEnum("verification_status").notNull().default("PENDIENTE"),
  isDemo: boolean("is_demo").notNull().default(false),
  /** Capturado a mano por un socio cuando la fuente no respondió. */
  isManual: boolean("is_manual").notNull().default(false),
  enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
}, (t) => [uniqueIndex("property_data_field_uq").on(t.propertyId, t.fieldKey)]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  kind: documentKindEnum("kind").notNull(),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("documents_property_idx").on(t.propertyId)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label"),
  inviteeEmail: text("invitee_email"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("invitations_property_idx").on(t.propertyId)]);

export const queryLogs = pgTable("query_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  durationMs: integer("duration_ms").notNull(),
  cacheHit: boolean("cache_hit").notNull().default(false),
  queriedAt: timestamp("queried_at", { withTimezone: true }).notNull().defaultNow(),
  errorMessage: text("error_message"),
}, (t) => [index("query_logs_property_idx").on(t.propertyId)]);

export const providerCache = pgTable("provider_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: text("cache_key").notNull().unique(),
  provider: text("provider").notNull(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const integrationRuns = pgTable("integration_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  triggeredBy: uuid("triggered_by").references(() => users.id),
  mode: dataModeEnum("mode").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  summary: jsonb("summary"),
}, (t) => [index("integration_runs_property_idx").on(t.propertyId)]);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, { fields: [properties.ownerId], references: [users.id] }),
  data: many(propertyData),
  documents: many(documents),
  invitations: many(invitations),
}));
export const propertyDataRelations = relations(propertyData, ({ one }) => ({
  property: one(properties, { fields: [propertyData.propertyId], references: [properties.id] }),
}));
export const documentsRelations = relations(documents, ({ one }) => ({
  property: one(properties, { fields: [documents.propertyId], references: [properties.id] }),
}));
export const invitationsRelations = relations(invitations, ({ one }) => ({
  property: one(properties, { fields: [invitations.propertyId], references: [properties.id] }),
}));

export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type PropertyDatum = typeof propertyData.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type IntegrationRun = typeof integrationRuns.$inferSelect;
export type Role = User["role"];
export type VerificationStatus = PropertyDatum["verificationStatus"];
