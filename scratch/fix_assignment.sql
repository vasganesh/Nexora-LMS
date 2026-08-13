-- Show all assignments with Docker in the name
SELECT id, title FROM "Assignment" WHERE title ILIKE '%docker%';

-- Remove "Docker " prefix from any assignment title
UPDATE "Assignment"
SET title = REPLACE(title, 'Docker ', '')
WHERE title ILIKE '%docker%';

-- Confirm result
SELECT id, title FROM "Assignment" WHERE id IN (SELECT id FROM "Assignment" ORDER BY "createdAt" DESC LIMIT 5);
