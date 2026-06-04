import { pgTable, serial, text, decimal, timestamp, boolean, uuid, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('User'),
  name: text('name').notNull(),
  photo: text('photo'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const income = pgTable('income', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  category: text('category').notNull(),
  source: text('source').notNull(),
  description: text('description'),
  date: timestamp('date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  source: text('source').notNull(),
  description: text('description'),
  attachment: text('attachment'),
  date: timestamp('date').defaultNow(),
  status: text('status').default('Pending'),
  managerNote: text('manager_note'),
  adminNote: text('admin_note'),
  deductedAmount: decimal('deducted_amount', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  date: timestamp('date').defaultNow(),
  read: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').default('Abirlink ERP'),
  logo: text('logo'),
  balances: jsonb('balances'),
});

export const requisitions = pgTable('requisitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: text('title').notNull(),
  items: text('items').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  reason: text('reason'),
  date: timestamp('date').defaultNow(),
  status: text('status').default('Pending'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockItems = pgTable('stock_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).default('0'),
  unit: text('unit').default('pcs'),
  lastPurchasePrice: decimal('last_purchase_price', { precision: 15, scale: 2 }).default('0'),
  minStockLevel: decimal('min_stock_level', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => stockItems.id),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
  dueAmount: decimal('due_amount', { precision: 15, scale: 2 }).default('0'),
  supplier: text('supplier'),
  source: text('source').notNull(),
  date: timestamp('date').defaultNow(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const duePayments = pgTable('due_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').references(() => purchases.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  source: text('source').notNull(),
  date: timestamp('date').defaultNow(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockOut = pgTable('stock_out', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => stockItems.id),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).notNull(),
  destination: text('destination').notNull(),
  date: timestamp('date').defaultNow(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
