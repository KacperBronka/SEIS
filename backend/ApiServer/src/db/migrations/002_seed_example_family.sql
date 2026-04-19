-- Example family seed data
-- Depends on users seeded in 001_init.sql

INSERT INTO `families` (`owner_id`, `owner_email`, `name`, `join_code`)
SELECT `id`, 'jan@example.com', 'Rodzina Kowalskich', 'FAMEX001'
FROM `users`
WHERE `gov_id` = 'ABC123456'
LIMIT 1;

INSERT INTO `family_members` (`user_id`, `family_id`)
SELECT `u`.`id`, `f`.`id`
FROM `users` `u`
JOIN `families` `f` ON `f`.`join_code` = 'FAMEX001'
WHERE `u`.`gov_id` IN ('ABC123456', 'DEF987654');
