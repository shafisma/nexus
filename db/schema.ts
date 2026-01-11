import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const messages = sqliteTable('Message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  userId: text('userId').notNull(),
  userName: text('userName').notNull(),
  guildId: text('guildId'), // Nullable for global chat
  roomId: text('roomId').default('general').notNull(),
  type: text('type', { enum: ['text', 'file', 'image', 'poll', 'gif'] }).default('text').notNull(),
  fileUrl: text('fileUrl'),
  fileName: text('fileName'),
  pollQuestion: text('pollQuestion'),
  pollOptions: text('pollOptions', { mode: 'json' }),
  seenBy: text('seenBy', { mode: 'json' }).$type<string[]>().default(sql`'[]'`).notNull(),
  status: text('status', { enum: ['sent', 'delivered', 'read'] }).default('sent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

export const guilds = sqliteTable('Guild', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  ownerId: text('ownerId').notNull(),
  inviteCode: text('inviteCode').unique().notNull(), // Simple 6-char code
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const guildMembers = sqliteTable('GuildMember', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: text('guildId').references(() => guilds.id).notNull(),
  userId: text('userId').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).default('member').notNull(),
  joinedAt: integer('joinedAt', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const rooms = sqliteTable('Room', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdBy: text('createdBy').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});


