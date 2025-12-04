-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Nov 11, 2025 at 07:43 PM
-- Server version: 8.0.40
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `CalmCast`
--

-- --------------------------------------------------------

--
-- Table structure for table `fitbit_connections`
--

CREATE TABLE `fitbit_connections` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `fitbit_user_id` varchar(100) NOT NULL,
  `access_token` text NOT NULL,
  `refresh_token` text NOT NULL,
  `token_expires_at` timestamp NOT NULL,
  `connected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_sync_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `fitbit_data`
--

CREATE TABLE `fitbit_data` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `heart_rate` int DEFAULT NULL,
  `sleep_hours` decimal(3,1) DEFAULT NULL,
  `steps` int DEFAULT NULL,
  `calories_burned` int DEFAULT NULL,
  `data_date` date NOT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `mood_entries`
--

CREATE TABLE `mood_entries` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` int NOT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `entry_date` date NOT NULL
) ;

-- --------------------------------------------------------

--
-- Table structure for table `stress_predictions`
--

CREATE TABLE `stress_predictions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `prediction` enum('Low','High') NOT NULL,
  `confidence` decimal(3,2) NOT NULL,
  `heart_rate` int NOT NULL,
  `sleep_hours` decimal(3,1) NOT NULL,
  `steps` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(80) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(128) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `fitbit_connections`
--
ALTER TABLE `fitbit_connections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `fitbit_user_id` (`fitbit_user_id`);

--
-- Indexes for table `fitbit_data`
--
ALTER TABLE `fitbit_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_date` (`user_id`,`data_date`);

--
-- Indexes for table `mood_entries`
--
ALTER TABLE `mood_entries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `entry_date` (`entry_date`);

--
-- Indexes for table `stress_predictions`
--
ALTER TABLE `stress_predictions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `created_at` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `expires_at` (`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `fitbit_connections`
--
ALTER TABLE `fitbit_connections`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fitbit_data`
--
ALTER TABLE `fitbit_data`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `mood_entries`
--
ALTER TABLE `mood_entries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stress_predictions`
--
ALTER TABLE `stress_predictions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `fitbit_connections`
--
ALTER TABLE `fitbit_connections`
  ADD CONSTRAINT `fitbit_connections_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fitbit_data`
--
ALTER TABLE `fitbit_data`
  ADD CONSTRAINT `fitbit_data_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `mood_entries`
--
ALTER TABLE `mood_entries`
  ADD CONSTRAINT `mood_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stress_predictions`
--
ALTER TABLE `stress_predictions`
  ADD CONSTRAINT `stress_predictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
