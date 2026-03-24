import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull().unique(),
  lastSeen: timestamp('last_seen').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id),
  userId: text('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  isSystemMessage: boolean('is_system_message').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  roomId: text('room_id').notNull().references(() => rooms.id),
  messageId: text('message_id').notNull().references(() => messages.id),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
});
