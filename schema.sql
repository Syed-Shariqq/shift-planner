CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Employee')),
  department VARCHAR(100) NOT NULL,
  max_hours_per_week INT NOT NULL DEFAULT 40,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0,
  color_code VARCHAR(7) DEFAULT '#3498db'
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id INT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Scheduled',
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_date_assignment UNIQUE (user_id, date)
);

CREATE TABLE swap_requests (
  id SERIAL PRIMARY KEY,
  from_assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  to_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  decided_by INT REFERENCES users(id),
  decided_at TIMESTAMP
);

CREATE TABLE shift_history (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  actual_start TIME,
  actual_end TIME,
  action VARCHAR(50) NOT NULL,
  notes TEXT,
  changed_by INT NOT NULL REFERENCES users(id),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_lookup ON users(email, department);
CREATE INDEX idx_assignments_seek ON assignments(date, user_id);
CREATE INDEX idx_swaps_status_chk ON swap_requests(status);
CREATE INDEX idx_history_user ON shift_history(user_id, date);
