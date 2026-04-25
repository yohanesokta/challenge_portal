import { mysqlTable, serial, varchar, text, timestamp, int, boolean } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: varchar('image', { length: 255 }),
  password: varchar('password', { length: 255 }),
  nim: varchar('nim', { length: 50 }),
  role: varchar('role', { length: 20 }).default('student').notNull(), // 'student', 'admin', 'superadmin', 'pending_admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const problems = mysqlTable('problems', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  duration: int('duration'), // in minutes
  timingMode: varchar('timing_mode', { length: 20 }).default('scheduled').notNull(), // 'scheduled' or 'manual'
  isPublic: boolean('is_public').default(true).notNull(),
  // SkemaSoal
  solutionType: varchar('solution_type', { length: 20 }).default('bebas').notNull(), // 'function' | 'class' | 'bebas'
  functionName: varchar('function_name', { length: 100 }),
  className: varchar('class_name', { length: 100 }),
  shortLink: varchar('short_link', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 })
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table penghubung kepemilikan soal
export const problemOwnership = mysqlTable('problem_ownership', {
  id: int('id').autoincrement().primaryKey(),
  problemId: varchar('problem_id', { length: 36 })
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).default('owner').notNull(), // 'owner', 'collaborator'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const testCases = mysqlTable('test_cases', {
  id: int('id').autoincrement().primaryKey(),
  problemId: varchar('problem_id', { length: 36 })
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  testScript: text('test_script').notNull(),
  expectedOutput: text('expected_output'),
  type: varchar('type', { length: 20 }).default('standard'),
  input: text('input'),
});

export const accounts = mysqlTable('accounts', {
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: int('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (account) => [
  {
    provider_providerAccountId: (account.provider, account.providerAccountId),
  }
]);

export const adminRequests = mysqlTable('admin_requests', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const submissions = mysqlTable('submissions', {
  id: int('id').autoincrement().primaryKey(),
  nim: varchar('nim', { length: 50 }).notNull(),
  userId: varchar('user_id', { length: 255 }),
  problemId: varchar('problem_id', { length: 36 })
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'pass', 'fail', 'error', 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const links = mysqlTable('links', {
  id: varchar('id', { length: 20 }).primaryKey(),
  longUrl: text('long_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
