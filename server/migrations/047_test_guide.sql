-- Test guide (UAT only): how each tester got on with each task in the in-app guide.
--   status       done or skipped (null while the task is still open)
--   rating       the tester's one-tap answer to "How easy was it?"
--   hint_used    whether they opened the task's hint
--   started_at   when the guide first showed them the task
--   finished_at  when HolyApp saw it done, or when they skipped it
-- The table stays empty unless the server runs with UAT_MODE=on.

CREATE TABLE IF NOT EXISTS test_guide_step (
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  step VARCHAR(40) NOT NULL,
  status VARCHAR(10) CHECK (status IN ('done', 'skipped')),
  rating VARCHAR(10) CHECK (rating IN ('easy', 'okay', 'hard')),
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, step)
);
