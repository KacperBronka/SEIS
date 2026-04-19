-- --------------------------------------------------------
-- Host:                         130.61.44.50
-- Wersja serwera:               11.4.10-MariaDB-ubu2404 - mariadb.org binary distribution
-- System operacyjny serwera:    debian-linux-gnu
-- HeidiSQL Wersja:              12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Zrzut struktury tabela seis.activity
CREATE TABLE IF NOT EXISTS `activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `token` tinytext NOT NULL,
  `verification_successful` bit(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_polish_ci;

-- Zrzucanie danych dla tabeli seis.activity: ~0 rows (około)

-- Zrzut struktury tabela seis.families
CREATE TABLE IF NOT EXISTS `families` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_id` int(11) NOT NULL,
  `owner_email` tinytext NOT NULL,
  `name` tinytext NOT NULL DEFAULT 'Rodzina',
  `join_code` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_families_join_code` (`join_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_polish_ci;

-- Zrzucanie danych dla tabeli seis.families: ~0 rows (około)

-- Zrzut struktury tabela seis.family_members
CREATE TABLE IF NOT EXISTS `family_members` (
  `user_id` int(11) NOT NULL,
  `family_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_polish_ci;

-- Zrzucanie danych dla tabeli seis.family_members: ~0 rows (około)

-- Zrzut struktury tabela seis.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` tinytext NOT NULL,
  `surname` tinytext NOT NULL,
  `gov_id` tinytext NOT NULL,
  `pesel` tinytext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_polish_ci;

-- Zrzucanie danych dla tabeli seis.users: ~5 rows (około)
INSERT INTO `users` (`id`, `name`, `surname`, `gov_id`, `pesel`)
SELECT * FROM (
  SELECT 1 AS `id`, 'Jan' AS `name`, 'Kowalski' AS `surname`, 'ABC123456' AS `gov_id`, '85031204558' AS `pesel`
  UNION ALL
  SELECT 2, 'Anna', 'Nowak', 'DEF987654', '92052011422'
  UNION ALL
  SELECT 3, 'Piotr', 'Wiśniewski', 'GHI456123', '78101508931'
  UNION ALL
  SELECT 4, 'Magdalena', 'Wójcik', 'JKL321654', '95070409865'
  UNION ALL
  SELECT 5, 'Krzysztof', 'Mazur', 'MNO741852', '88122402179'
) AS seed_users
WHERE NOT EXISTS (SELECT 1 FROM `users` LIMIT 1);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
