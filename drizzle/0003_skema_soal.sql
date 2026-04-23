-- Migration: Add SkemaSoal columns to problems, unify test_cases to script-first
-- Run this manually if not using drizzle push

-- Add solution_type, function_name, class_name to problems
ALTER TABLE `problems`
  ADD COLUMN `solution_type` varchar(20) NOT NULL DEFAULT 'bebas',
  ADD COLUMN `function_name` varchar(100),
  ADD COLUMN `class_name` varchar(100);

-- Add test_script as NOT NULL with default '' then fix
-- First add as nullable for existing rows, then set default
ALTER TABLE `test_cases`
  ADD COLUMN `test_script_new` text;

-- Copy old test_script (custom) or build from input/expected_output
UPDATE `test_cases`
SET `test_script_new` = CASE
  WHEN `test_script` IS NOT NULL AND `test_script` != '' THEN `test_script`
  ELSE CONCAT('# Test case (legacy input/output)\n# Input: ', IFNULL(`input`,''), '\n# Expected: ', IFNULL(`expected_output`,''))
END;

-- Drop old test_script and rename
ALTER TABLE `test_cases`
  DROP COLUMN `test_script`,
  RENAME COLUMN `test_script_new` TO `test_script`;

-- test_script must be NOT NULL (set empty string for any remaining NULLs)
UPDATE `test_cases` SET `test_script` = '' WHERE `test_script` IS NULL;
ALTER TABLE `test_cases` MODIFY `test_script` text NOT NULL;
