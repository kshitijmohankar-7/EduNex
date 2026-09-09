-- Sample seed data for local development / demo purposes

INSERT INTO departments (name, code) VALUES ('Computer Science', 'CSE');
INSERT INTO courses (department_id, name, duration_years) VALUES (1, 'B.Tech Computer Science', 4);
INSERT INTO academic_years (label) VALUES ('2025-2026');
INSERT INTO semesters (course_id, number) VALUES (1, 3);
INSERT INTO divisions (semester_id, name) VALUES (1, 'A');

INSERT INTO subjects (semester_id, name, code, credits) VALUES
 (1, 'Database Management Systems', 'DBMS301', 4),
 (1, 'Mathematics III', 'MATH301', 4),
 (1, 'Physics', 'PHY301', 3),
 (1, 'Programming Fundamentals', 'PROG301', 4);

-- password_hash values below are placeholders; generate real bcrypt hashes via the register endpoint
INSERT INTO users (email, password_hash, role, full_name) VALUES
 ('student1@edunex.edu', '$2b$10$placeholderplaceholderplaceholderplaceh', 'student', 'Asha Patel'),
 ('faculty1@edunex.edu', '$2b$10$placeholderplaceholderplaceholderplaceh', 'faculty', 'Dr. Rohan Mehta'),
 ('admin1@edunex.edu',   '$2b$10$placeholderplaceholderplaceholderplaceh', 'admin',   'College Admin');

INSERT INTO students (user_id, student_code, department_id, course_id, current_semester_id, division_id, academic_year_id)
VALUES (1, 'CSE2025001', 1, 1, 1, 1, 1);

INSERT INTO faculty (user_id, faculty_code, department_id) VALUES (2, 'FAC001', 1);

INSERT INTO faculty_subject_assignments (faculty_id, subject_id, division_id) VALUES
 (1, 1, 1), (1, 2, 1);

INSERT INTO marks (student_id, subject_id, exam_type, max_marks, obtained_marks, entered_by, published) VALUES
 (1, 1, 'ct1', 100, 75, 1, TRUE),
 (1, 1, 'ct2', 100, 80, 1, TRUE),
 (1, 2, 'ct1', 100, 78, 1, TRUE),
 (1, 2, 'ct2', 100, 82, 1, TRUE);

INSERT INTO attendance (student_id, subject_id, class_date, status, marked_by) VALUES
 (1, 1, '2026-08-01', 'present', 1),
 (1, 1, '2026-08-02', 'present', 1),
 (1, 1, '2026-08-03', 'absent', 1);
