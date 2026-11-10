UPDATE "users"
SET "email" = CASE
  WHEN "email" = 'student@edu.mukpid' AND "role" = 'student' THEN 'student@edu.mukpid.ru'
  WHEN "email" = 'student2@edu.mukpid' AND "role" = 'student' THEN 'student2@edu.mukpid.ru'
  WHEN "email" = 'teacher@mukpid' AND "role" = 'teacher' THEN 'teacher@mukpid.ru'
  WHEN "email" = 'staff@staff.mukpid' AND "role" = 'staff' THEN 'staff@staff.mukpid.ru'
  ELSE "email"
END
WHERE ("email" = 'student@edu.mukpid' AND "role" = 'student')
   OR ("email" = 'student2@edu.mukpid' AND "role" = 'student')
   OR ("email" = 'teacher@mukpid' AND "role" = 'teacher')
   OR ("email" = 'staff@staff.mukpid' AND "role" = 'staff');
