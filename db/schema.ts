import { mysqlTable, serial, varchar, text, timestamp, int, boolean } from 'drizzle-orm/mysql-core';

export const problems = mysqlTable('problems', {
  id: int('id').autoincrement().primaryKey(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const testCases = mysqlTable('test_cases', {
  id: int('id').autoincrement().primaryKey(),
  problemId: int('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  // Unified Python script test case (all types)
  testScript: text('test_script').notNull(),
  // For 'bebas' type: expected stdout to compare against
  expectedOutput: text('expected_output'),
  // Legacy columns (kept for backward compat, nullable)
  type: varchar('type', { length: 20 }).default('standard'),
  input: text('input'),
});

export const submissions = mysqlTable('submissions', {
  id: int('id').autoincrement().primaryKey(),
  nim: varchar('nim', { length: 50 }).notNull(),
  problemId: int('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'pass', 'fail', 'error', 'pending'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
