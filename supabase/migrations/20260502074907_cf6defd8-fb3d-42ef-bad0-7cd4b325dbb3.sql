
-- Delete all data for non-admin users
-- Admin to preserve: 8234fd4f-71f2-4f72-a4ac-782651b255c7

-- Delete predictions
DELETE FROM predictions WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete award predictions
DELETE FROM award_predictions WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete champion predictions
DELETE FROM champion_predictions WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete user submissions
DELETE FROM user_submissions WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete event user points
DELETE FROM event_user_points WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete leaderboard snapshots
DELETE FROM leaderboard_snapshot WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete notification outbox
DELETE FROM notification_outbox WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete push subscriptions
DELETE FROM push_subscriptions WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete notification settings
DELETE FROM user_notification_settings WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete user roles (non-admin entries)
DELETE FROM user_roles WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete profiles
DELETE FROM profiles WHERE user_id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';

-- Delete auth users (non-admin)
DELETE FROM auth.users WHERE id != '8234fd4f-71f2-4f72-a4ac-782651b255c7';
