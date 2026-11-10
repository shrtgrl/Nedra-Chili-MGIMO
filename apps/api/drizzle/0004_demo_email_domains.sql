UPDATE "users" SET "email" = CASE
  WHEN "email" = 'student@mukpid.example' AND "role" = 'student' THEN 'student@edu.mukpid'
  WHEN "email" = 'student2@mukpid.example' AND "role" = 'student' THEN 'student2@edu.mukpid'
  WHEN "email" = 'teacher@mukpid.example' AND "role" = 'teacher' THEN 'teacher@mukpid'
  WHEN "email" = 'staff@mukpid.example' AND "role" = 'staff' THEN 'staff@staff.mukpid'
  ELSE "email"
END
WHERE ("email" = 'student@mukpid.example' AND "role" = 'student')
   OR ("email" = 'student2@mukpid.example' AND "role" = 'student')
   OR ("email" = 'teacher@mukpid.example' AND "role" = 'teacher')
   OR ("email" = 'staff@mukpid.example' AND "role" = 'staff');
