import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  resumeText: text("resume_text").notNull(),
  parsedJson: jsonb("parsed_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentEpochs = pgTable("agent_epochs", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  note: text("note"),
  resumeHash: text("resume_hash"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
});

export const searchParams = pgTable("search_params", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  epochId: integer("epoch_id").references(() => agentEpochs.id, { onDelete: "cascade" }),
  paramsJson: jsonb("params_json").notNull(),
  isCurrent: boolean("is_current").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentSettings = pgTable("agent_settings", {
  id: integer("id").primaryKey().default(1),
  paused: boolean("paused").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    epochId: integer("epoch_id").references(() => agentEpochs.id, { onDelete: "cascade" }),
    urlHash: text("url_hash").notNull(),
    externalId: text("external_id"),
    title: text("title").notNull(),
    company: text("company").notNull(),
    description: text("description").notNull(),
    url: text("url").notNull(),
    location: text("location"),
    source: text("source").notNull().default("adzuna"),
    score: real("score"),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("jobs_epoch_url_hash_idx").on(table.epochId, table.urlHash)]
);

export const paramHistory = pgTable("param_history", {
  id: serial("id").primaryKey(),
  epochId: integer("epoch_id").references(() => agentEpochs.id, { onDelete: "cascade" }),
  beforeJson: jsonb("before_json").notNull(),
  afterJson: jsonb("after_json").notNull(),
  triggerPhrases: jsonb("trigger_phrases").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
