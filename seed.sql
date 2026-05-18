BEGIN;

TRUNCATE TABLE shift_history, swap_requests, assignments, shifts, users RESTART IDENTITY CASCADE;

INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  role,
  department,
  max_hours_per_week
) VALUES
  (
    1,
    'Admin User',
    'admin@demo.com',
    '$2b$10$5KWW3y2m9NBHC7/nIqqG2./XjBTDx7WP5a3Dll7NPAGWO5bYR2MEm',
    'Admin',
    'Management',
    40
  ),
  (
    2,
    'Ahmed Khan',
    'emp1@demo.com',
    '$2b$10$Pku0LqfiUlEeseOu5mI/Fudl1ch7Ct5oR7Wz4lKz9mZLIPXUMEdwi',
    'Employee',
    'Engineering',
    40
  ),
  (
    3,
    'Sara Malik',
    'emp2@demo.com',
    '$2b$10$aS4q3TA.ixNCdW7bTKeaoe8RXxn8QnY/r1xwJlwRNOmV9dP8WH9RO',
    'Employee',
    'Engineering',
    40
  );

INSERT INTO shifts (
  id,
  name,
  start_time,
  end_time,
  break_minutes,
  color_code
) VALUES
  (1, 'Morning', '09:00', '17:00', 30, '#ebf8ff'),
  (2, 'Evening', '14:00', '22:00', 30, '#e6fffa'),
  (3, 'Night', '22:00', '06:00', 60, '#edf2f7');

INSERT INTO assignments (
  id,
  user_id,
  shift_id,
  date,
  status,
  created_by
) VALUES
  (1, 2, 1, '2026-05-18', 'Scheduled', 1),
  (2, 2, 1, '2026-05-19', 'Scheduled', 1),
  (3, 2, 1, '2026-05-20', 'Scheduled', 1),
  (4, 3, 2, '2026-05-18', 'Scheduled', 1),
  (5, 3, 2, '2026-05-19', 'Scheduled', 1),
  (6, 3, 2, '2026-05-20', 'Scheduled', 1),
  (7, 2, 3, '2026-05-21', 'Scheduled', 1);

INSERT INTO swap_requests (
  id,
  from_assignment_id,
  to_user_id,
  reason,
  status
) VALUES
  (
    1,
    7,
    3,
    'Ahmed Khan requests to swap his Thursday Night shift with Sara Malik.',
    'Pending'
  );

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('shifts_id_seq', (SELECT MAX(id) FROM shifts));
SELECT setval('assignments_id_seq', (SELECT MAX(id) FROM assignments));
SELECT setval('swap_requests_id_seq', (SELECT MAX(id) FROM swap_requests));

COMMIT;
