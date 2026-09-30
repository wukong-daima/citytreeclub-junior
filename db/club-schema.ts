import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const profiles = sqliteTable("club_profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("나무 친구"),
  areas: text("areas").notNull().default("[]"),
});
export const owned = sqliteTable(
  "club_owned",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    treeId: text("tree_id").notNull(),
    nickname: text("nickname").notNull().default(""),
    decoration: text("decoration").notNull().default("none"),
    health: text("health").notNull().default("[]"),
    girth: integer("girth"),
    size: text("size").notNull().default("medium"),
    species: text("species").notNull().default(""),
  },
  (t) => [uniqueIndex("club_owned_unique").on(t.owner, t.treeId)],
);
export const favorites = sqliteTable(
  "club_favorites",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    treeId: text("tree_id").notNull(),
  },
  (t) => [uniqueIndex("club_favorites_unique").on(t.owner, t.treeId)],
);
export const records = sqliteTable("club_records", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  treeId: text("tree_id").notNull(),
  text: text("text").notNull(),
  photoKey: text("photo_key"),
  visibility: text("visibility").notNull(),
  health: text("health").notNull(),
  girth: integer("girth").notNull(),
  size: text("size").notNull(),
  createdAt: text("created_at").notNull(),
});
export const comments = sqliteTable("club_comments", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  recordId: text("record_id").notNull(),
  text: text("text").notNull(),
  photoKey: text("photo_key"),
  createdAt: text("created_at").notNull(),
});
export const likes = sqliteTable(
  "club_likes",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    recordId: text("record_id").notNull(),
  },
  (t) => [uniqueIndex("club_likes_unique").on(t.owner, t.recordId)],
);
export const notifications = sqliteTable("club_notifications", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  text: text("text").notNull(),
  read: integer("read").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const reports = sqliteTable("club_reports", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  treeId: text("tree_id").notNull(),
  text: text("text").notNull(),
  kind: text("kind").notNull().default("error"),
  details: text("details").notNull().default("{}"),
  status: text("status").notNull().default("demo_pending"),
  createdAt: text("created_at").notNull(),
});
export const photos = sqliteTable("club_photos", {
  key: text("key").primaryKey(),
  owner: text("owner").notNull(),
  mime: text("mime").notNull(),
  createdAt: text("created_at").notNull(),
});
