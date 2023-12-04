-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 03, 2023 at 07:10 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `stretchfitness_data`
--

-- --------------------------------------------------------

--
-- Table structure for table `adminusers`
--

CREATE TABLE `adminusers` (
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `adminusers`
--

INSERT INTO `adminusers` (`name`, `email`, `password`) VALUES
('Kirk Cart', 'cart@gmail.com', '$2b$10$uQ9Xf3A7PyjCOqYs49cm4u1HQoIta1XxrMZIf1jSa7LaRu18s3LIS'),
('Nero cyrus', 'nero@gmail.com', '$2b$10$E0i9RbnT4qCfoWMhb9cyGe6CIf0Ob/xH5LgkkkMaFdqOyw768/HBW');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `id` int(11) NOT NULL,
  `category` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `date` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`id`, `category`, `title`, `content`, `date`) VALUES
(50, 'Gym equipment', 'Gym equipment maasim', 'Pakilinis naman ng equipments after use', '2023-12-03'),
(51, 'Gym equipment', 'Gym equipment nawawala', 'Please lang wag nakawin ang mga gym equipment', '2023-12-03'),
(52, 'Gym Holiday', 'Walang gym', 'Walang gym sa mga ganitong araw', '2023-12-03');

-- --------------------------------------------------------

--
-- Table structure for table `archived_member_names`
--

CREATE TABLE `archived_member_names` (
  `id` int(11) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `member_names`
--

CREATE TABLE `member_names` (
  `id` int(11) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `member_names`
--

INSERT INTO `member_names` (`id`, `firstName`, `lastName`, `timestamp`) VALUES
(34, 'Cyrus Angelo', 'Orpilla', '2023-11-28 15:28:34'),
(35, 'Kirk Cedrick', 'Cartaño', '2023-11-29 10:40:32'),
(36, 'Evhan', 'Endrosa', '2023-11-30 02:36:53'),
(37, 'Cass', 'Canaliza', '2023-11-30 14:44:17'),
(38, 'Cyrus Angelo', 'Orpilla', '2023-12-02 09:00:41'),
(39, 'Noli', 'Licudo', '2023-12-03 03:44:54'),
(40, 'Evhan', 'Endrosa', '2023-12-03 03:56:08');

-- --------------------------------------------------------

--
-- Table structure for table `monthly_transactions`
--

CREATE TABLE `monthly_transactions` (
  `id` int(11) NOT NULL,
  `month` varchar(20) DEFAULT NULL,
  `waterBill` decimal(10,2) DEFAULT NULL,
  `electricBill` decimal(10,2) DEFAULT NULL,
  `drinkableWaterBill` decimal(10,2) DEFAULT NULL,
  `productSales` decimal(10,2) DEFAULT NULL,
  `subscription` decimal(10,2) DEFAULT NULL,
  `walkIn` decimal(10,2) DEFAULT NULL,
  `monthlyExpense` decimal(10,2) DEFAULT NULL,
  `monthlyIncome` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `monthly_transactions`
--

INSERT INTO `monthly_transactions` (`id`, `month`, `waterBill`, `electricBill`, `drinkableWaterBill`, `productSales`, `subscription`, `walkIn`, `monthlyExpense`, `monthlyIncome`) VALUES
(2, 'January', 500.00, 3000.00, 50.00, 800.00, 700.00, 900.00, 3550.00, 2400.00),
(3, 'February', 69.00, 69.00, 420.00, 690.00, 80.00, 9000.00, 558.00, 9770.00),
(4, 'March', 694.00, 800.00, 896.00, 800.00, 700.00, 8000.00, 2390.00, 9500.00),
(5, 'April', 900.00, 9422.00, 5233.00, 72351.00, 741264.00, 74266.00, 15555.00, 887881.00),
(6, 'May', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(7, 'June', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(8, 'July', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(9, 'August', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(10, 'September', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(11, 'October', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(12, 'November', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00),
(13, 'December', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `subscribed_members`
--

CREATE TABLE `subscribed_members` (
  `userId` int(11) DEFAULT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `membershipType` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contactNumber` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscribed_members`
--

INSERT INTO `subscribed_members` (`userId`, `firstName`, `lastName`, `membershipType`, `email`, `contactNumber`) VALUES
(4, 'Cyrus Angelo', 'Orpilla', 'student', 'cyrusorpils@gmail.com', ''),
(5, 'Kirk Cedrick', 'Cartaño', 'student', 'kirk@gmail.com', ''),
(6, 'Ae', 'Ladroma', 'regular', 'aebc@gmail.com', '09179996969'),
(7, 'Evhan', 'Endrosa', 'regular', 'endrosa@gmail.com', ''),
(8, 'Cass', 'Canaliza', 'student', 'canaliza@gmail.com', ''),
(10, 'Noli', 'Licudo', 'regular', 'licudo@gmail.com', '696969'),
(12, 'Ev', 'ef', 'regular', 'ef@gmail.com', ''),
(11, 'Ivan wayne', 'Tolopia', 'student', 'tolopia@gmail.com', '');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `membershipType` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `qrCodePath` varchar(255) NOT NULL,
  `id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`firstName`, `lastName`, `email`, `membershipType`, `password`, `qrCodePath`, `id`) VALUES
('Cyrus Angelo', 'Orpilla', 'cyrusorpils@gmail.com', 'student', '$2b$10$iPYSeSToR96mx8zuBU.ImeYmg0p2SAISnMKexYK6Uybn0sN7dg41C', '/qrcodes/Cyrus-AngeloOrpilla.png', 4),
('Kirk Cedrick', 'Cartaño', 'kirk@gmail.com', 'student', '$2b$10$uEWE1Dpgq0UUyJ03Bl905.Pnh68lMCkhfWuAK4.e28Hx/L1xUKsdC', '/qrcodes/Kirk-CedrickCarta%C3%B1o.png', 5),
('Ae', 'Ladroma', 'aebc@gmail.com', 'regular', '$2b$10$YnO0JXMEFAFrwgDa4GPEDOEDgklGoQtntboOfY903mG226Kxl8Aw.', '/qrcodes/AeLadroma.png', 6),
('Evhan', 'Endrosa', 'endrosa@gmail.com', 'regular', '$2b$10$wuKQeyYESbkeUkdIvtTWY.Z8haK.drv0Rz0NswdWxbNXLeOn5FfFC', '/qrcodes/EvhanEndrosa.png', 7),
('Cass', 'Canaliza', 'canaliza@gmail.com', 'student', '$2b$10$4TGAjNqzNwndBsljxFgyeuoRAfgsNXfkp.vEOnM70BILnJ69GwRju', '/qrcodes/CassCanaliza.png', 8),
('Noli', 'Licudo', 'licudo@gmail.com', 'regular', '$2b$10$b7Hy/3rVQRYUhwpfRwO5t.rKWxYIDOyVqdwxFabVrWHRJxD4m8dOq', '/qrcodes/NoliLicudo.png', 10),
('Ivan wayne', 'Tolopia', 'tolopia@gmail.com', 'student', '$2b$10$oY3DWF/hhQ.9QSLeHOCR.u8EsjDcbdfgwP0Zu5JGdCKgh0lvFTu2G', '/qrcodes/Ivan-wayneTolopia.png', 11),
('Ev', 'ef', 'ef@gmail.com', 'regular', '$2b$10$1oopJrNvHj2j.gzT.feaq.gWjWSAW416HmK3uRazt1QszWLFi1y26', '/qrcodes/Evef.png', 12),
('Leo', 'Llusala', 'llusala@gmail.com', 'student', '$2b$10$O19o8XnBRXo/w6uXJmOIUuG8BJ8J9PKMC3FKoTrBA0fIKWQlAQ2MS', '/qrcodes/LeoLlusala.png', 13);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `adminusers`
--
ALTER TABLE `adminusers`
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `archived_member_names`
--
ALTER TABLE `archived_member_names`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `member_names`
--
ALTER TABLE `member_names`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `monthly_transactions`
--
ALTER TABLE `monthly_transactions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `subscribed_members`
--
ALTER TABLE `subscribed_members`
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `archived_member_names`
--
ALTER TABLE `archived_member_names`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `member_names`
--
ALTER TABLE `member_names`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `monthly_transactions`
--
ALTER TABLE `monthly_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `subscribed_members`
--
ALTER TABLE `subscribed_members`
  ADD CONSTRAINT `subscribed_members_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
