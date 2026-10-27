-- Activity with no signed-in person behind it (PayMongo webhooks, guest gifts and intentions) is still worth
-- recording, so an audit entry may have no actor.
ALTER TABLE audit_log ALTER COLUMN actor_id DROP NOT NULL;
