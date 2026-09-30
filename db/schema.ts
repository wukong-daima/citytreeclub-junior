import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export * from "./club-schema";
export const gardens = sqliteTable("gardens", {
  id: text("id").primaryKey(),
  treeId: text("tree_id"),
  decoration: text("decoration").notNull().default("none"),
  nickname: text("nickname").notNull().default(""),
  tutorialCompleted: integer("tutorial_completed").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const actions = sqliteTable(
  "actions",
  {
    id: text("id").primaryKey(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id),
    treeId: text("tree_id"),
    action: text("action").notNull(),
    day: text("day").notNull(),
    xp: integer("xp").notNull().default(0),
    text: text("text").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("actions_daily_unique").on(
      table.gardenId,
      table.action,
      table.day,
    ),
  ],
);
export const gameRuns = sqliteTable("game_runs", {
  id: text("id").primaryKey(),
  gardenId: text("garden_id")
    .notNull()
    .references(() => gardens.id),
  treeId: text("tree_id"),
  game: text("game").notNull(),
  targets: text("targets").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    gardenId: text("garden_id")
      .notNull()
      .references(() => gardens.id),
    treeId: text("tree_id"),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("applications_kind_unique").on(table.gardenId, table.kind),
  ],
);
