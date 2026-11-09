import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved Wallpapers table persisted in PostgreSQL
export const savedWallpapers = pgTable('saved_wallpapers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  wallpaperId: text('wallpaper_id').notNull(),
  imageUrl: text('image_url').notNull(),
  prompt: text('prompt').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  imageSize: text('image_size').notNull(),
  model: text('model').notNull(),
  variationIndex: integer('variation_index').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  savedWallpapers: many(savedWallpapers),
}));

export const savedWallpapersRelations = relations(savedWallpapers, ({ one }) => ({
  user: one(users, {
    fields: [savedWallpapers.userId],
    references: [users.id],
  }),
}));
