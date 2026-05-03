-- Remove reminder notification templates
DELETE FROM notification_templates WHERE key IN ('reminder_7', 'reminder_3', 'reminder_1');
