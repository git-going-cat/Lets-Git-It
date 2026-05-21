-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: letsgitit
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `competitive_command_set`
--

DROP TABLE IF EXISTS `competitive_command_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competitive_command_set` (
  `competitive_command_set_id` binary(16) NOT NULL,
  `mode` enum('CONTRIBUTION','TIME_ATTACK') NOT NULL,
  `player_count` int DEFAULT NULL,
  `set_number` int NOT NULL,
  PRIMARY KEY (`competitive_command_set_id`),
  UNIQUE KEY `uq_competitive_command_set` (`set_number`,`mode`,`player_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competitive_command_set`
--

LOCK TABLES `competitive_command_set` WRITE;
/*!40000 ALTER TABLE `competitive_command_set` DISABLE KEYS */;
INSERT INTO `competitive_command_set` VALUES (_binary '©¸_T<ñ)l*¨','CONTRIBUTION',2,1),(_binary '\ÙT<ñ)l*¨','CONTRIBUTION',3,1),(_binary '~WT<ñ)l*¨','CONTRIBUTION',4,1),(_binary '¯üT<ñ)l*¨','CONTRIBUTION',2,2),(_binary 'òBT<ñ)l*¨','CONTRIBUTION',3,2),(_binary '±T<ñ)l*¨','CONTRIBUTION',4,2),(_binary '¶QT<ñ)l*¨','CONTRIBUTION',2,3),(_binary '¤r¥T<ñ)l*¨','CONTRIBUTION',3,3),(_binary 'OT<ñ)l*¨','CONTRIBUTION',4,3);
/*!40000 ALTER TABLE `competitive_command_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competitive_command_set_item`
--

DROP TABLE IF EXISTS `competitive_command_set_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competitive_command_set_item` (
  `competitive_command_set_item_id` binary(16) NOT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `command_text` varchar(255) NOT NULL,
  `competitive_command_set_id` binary(16) NOT NULL,
  `sequence` int NOT NULL,
  PRIMARY KEY (`competitive_command_set_item_id`),
  UNIQUE KEY `uq_competitive_command_set_item` (`competitive_command_set_id`,`sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competitive_command_set_item`
--

LOCK TABLES `competitive_command_set_item` WRITE;
/*!40000 ALTER TABLE `competitive_command_set_item` DISABLE KEYS */;
INSERT INTO `competitive_command_set_item` VALUES (_binary '¹T<ñ)l*¨','main','git fetch origin',_binary '~WT<ñ)l*¨',1),(_binary '¼@T<ñ)l*¨','main','git pull origin main',_binary '~WT<ñ)l*¨',2),(_binary '½\ZT<ñ)l*¨','main','git status',_binary '~WT<ñ)l*¨',3),(_binary '½wT<ñ)l*¨','main','git log --oneline',_binary '~WT<ñ)l*¨',4),(_binary '½\ÎT<ñ)l*¨','feat/login','git add src/Login.js',_binary '~WT<ñ)l*¨',5),(_binary '¾,T<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '~WT<ñ)l*¨',6),(_binary '¾¥T<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '~WT<ñ)l*¨',7),(_binary '¿!T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '~WT<ñ)l*¨',8),(_binary '¿¢T<ñ)l*¨','main','git diff',_binary '~WT<ñ)l*¨',9),(_binary 'ÀT<ñ)l*¨','feat/login','git add src/Auth.js',_binary '~WT<ñ)l*¨',10),(_binary 'ÀT<ñ)l*¨','feat/profile','git add src/Profile.js',_binary '~WT<ñ)l*¨',11),(_binary 'ÁT<ñ)l*¨','feat/payment','git rebase main',_binary '~WT<ñ)l*¨',12),(_binary 'ÁpT<ñ)l*¨','feat/login','git commit -m \'feat: auth\'',_binary '~WT<ñ)l*¨',13),(_binary 'Á¼T<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary '~WT<ñ)l*¨',14),(_binary '\ÂT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '~WT<ñ)l*¨',15),(_binary '\ÂXT<ñ)l*¨','main','git stash',_binary '~WT<ñ)l*¨',16),(_binary 'Â©T<ñ)l*¨','feat/login','git push origin feat/login',_binary '~WT<ñ)l*¨',17),(_binary '\ÂùT<ñ)l*¨','feat/profile','git add src/Avatar.js',_binary '~WT<ñ)l*¨',18),(_binary '\ÃST<ñ)l*¨','feat/cart','git add src/Cart.js',_binary '~WT<ñ)l*¨',19),(_binary '\Ã\ÈT<ñ)l*¨','feat/profile','git commit -m \'feat: avatar\'',_binary '~WT<ñ)l*¨',20),(_binary '\Ä*T<ñ)l*¨','feat/cart','git commit -m \'feat: cart\'',_binary '~WT<ñ)l*¨',21),(_binary 'Ä T<ñ)l*¨','main','git merge feat/payment',_binary '~WT<ñ)l*¨',22),(_binary '\ÅT<ñ)l*¨','feat/profile','git push origin feat/profile',_binary '~WT<ñ)l*¨',23),(_binary '\ÅT<ñ)l*¨','feat/cart','git push origin feat/cart',_binary '~WT<ñ)l*¨',24),(_binary '\Å\ÍT<ñ)l*¨','main','git merge feat/login',_binary '~WT<ñ)l*¨',25),(_binary '\ÆT<ñ)l*¨','main','git merge feat/profile',_binary '~WT<ñ)l*¨',26),(_binary '\ÆcT<ñ)l*¨','main','git merge feat/cart',_binary '~WT<ñ)l*¨',27),(_binary '\ÇT<ñ)l*¨','main','git push origin main',_binary '~WT<ñ)l*¨',28),(_binary '\ÇYT<ñ)l*¨','main','git fetch origin',_binary '~WT<ñ)l*¨',29),(_binary 'Ç§T<ñ)l*¨','main','git pull origin main',_binary '~WT<ñ)l*¨',30),(_binary 'uT<ñ)l*¨','main','git fetch origin',_binary '±T<ñ)l*¨',1),(_binary 'wT<ñ)l*¨','main','git pull origin main',_binary '±T<ñ)l*¨',2),(_binary 'xT<ñ)l*¨','main','git status',_binary '±T<ñ)l*¨',3),(_binary 'xnT<ñ)l*¨','main','git diff',_binary '±T<ñ)l*¨',4),(_binary 'x\ÐT<ñ)l*¨','feat/cart','git add src/Cart.js',_binary '±T<ñ)l*¨',5),(_binary 'y)T<ñ)l*¨','feat/profile','git add src/Profile.js',_binary '±T<ñ)l*¨',6),(_binary 'yT<ñ)l*¨','feat/cart','git commit -m \'feat: cart\'',_binary '±T<ñ)l*¨',7),(_binary 'y\ÕT<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary '±T<ñ)l*¨',8),(_binary 'z,T<ñ)l*¨','main','git log --oneline',_binary '±T<ñ)l*¨',9),(_binary 'z~T<ñ)l*¨','feat/cart','git add src/CartItem.js',_binary '±T<ñ)l*¨',10),(_binary 'z\ÓT<ñ)l*¨','feat/login','git add src/Login.js',_binary '±T<ñ)l*¨',11),(_binary '{%T<ñ)l*¨','feat/profile','git rebase main',_binary '±T<ñ)l*¨',12),(_binary '{¡T<ñ)l*¨','feat/cart','git commit -m \'feat: cart item\'',_binary '±T<ñ)l*¨',13),(_binary '|$T<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '±T<ñ)l*¨',14),(_binary '|T<ñ)l*¨','feat/profile','git push origin feat/profile',_binary '±T<ñ)l*¨',15),(_binary '|÷T<ñ)l*¨','main','git reset --soft HEAD~1',_binary '±T<ñ)l*¨',16),(_binary '}JT<ñ)l*¨','feat/cart','git push origin feat/cart',_binary '±T<ñ)l*¨',17),(_binary '~T<ñ)l*¨','feat/login','git add src/Auth.js',_binary '±T<ñ)l*¨',18),(_binary '~hT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '±T<ñ)l*¨',19),(_binary '~·T<ñ)l*¨','feat/login','git commit -m \'fix: auth\'',_binary '±T<ñ)l*¨',20),(_binary 'T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '±T<ñ)l*¨',21),(_binary 'UT<ñ)l*¨','main','git merge feat/profile',_binary '±T<ñ)l*¨',22),(_binary '¦T<ñ)l*¨','feat/login','git push origin feat/login',_binary '±T<ñ)l*¨',23),(_binary 'ôT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '±T<ñ)l*¨',24),(_binary 'AT<ñ)l*¨','main','git merge feat/cart',_binary '±T<ñ)l*¨',25),(_binary 'T<ñ)l*¨','main','git merge feat/login',_binary '±T<ñ)l*¨',26),(_binary '\âT<ñ)l*¨','main','git merge feat/payment',_binary '±T<ñ)l*¨',27),(_binary '0T<ñ)l*¨','main','git push origin main',_binary '±T<ñ)l*¨',28),(_binary 'T<ñ)l*¨','main','git fetch origin',_binary '±T<ñ)l*¨',29),(_binary '\×T<ñ)l*¨','main','git pull origin main',_binary '±T<ñ)l*¨',30),(_binary '\éT<ñ)l*¨','main','git fetch origin',_binary 'OT<ñ)l*¨',1),(_binary '\ë\ãT<ñ)l*¨','main','git pull origin main',_binary 'OT<ñ)l*¨',2),(_binary '\ìtT<ñ)l*¨','main','git status',_binary 'OT<ñ)l*¨',3),(_binary '\ì\ÚT<ñ)l*¨','main','git cherry-pick abc123',_binary 'OT<ñ)l*¨',4),(_binary '\í@T<ñ)l*¨','feat/profile','git add src/Profile.js',_binary 'OT<ñ)l*¨',5),(_binary '\íT<ñ)l*¨','feat/login','git add src/Login.js',_binary 'OT<ñ)l*¨',6),(_binary '\í\ìT<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary 'OT<ñ)l*¨',7),(_binary '\îIT<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary 'OT<ñ)l*¨',8),(_binary '\î\ÉT<ñ)l*¨','main','git diff --staged',_binary 'OT<ñ)l*¨',9),(_binary '\ïNT<ñ)l*¨','feat/profile','git add src/Avatar.js',_binary 'OT<ñ)l*¨',10),(_binary '\ï\ÎT<ñ)l*¨','feat/cart','git add src/Cart.js',_binary 'OT<ñ)l*¨',11),(_binary 'ð;T<ñ)l*¨','feat/login','git rebase main',_binary 'OT<ñ)l*¨',12),(_binary 'ðT<ñ)l*¨','feat/profile','git commit -m \'feat: avatar\'',_binary 'OT<ñ)l*¨',13),(_binary 'ð\âT<ñ)l*¨','feat/cart','git commit -m \'feat: cart\'',_binary 'OT<ñ)l*¨',14),(_binary 'ñ1T<ñ)l*¨','feat/login','git push origin feat/login',_binary 'OT<ñ)l*¨',15),(_binary 'ñT<ñ)l*¨','main','git stash pop',_binary 'OT<ñ)l*¨',16),(_binary 'ñ\äT<ñ)l*¨','feat/profile','git push origin feat/profile',_binary 'OT<ñ)l*¨',17),(_binary 'ó$T<ñ)l*¨','feat/cart','git add src/CartItem.js',_binary 'OT<ñ)l*¨',18),(_binary 'óT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary 'OT<ñ)l*¨',19),(_binary 'ó\×T<ñ)l*¨','feat/cart','git commit -m \'feat: cart item\'',_binary 'OT<ñ)l*¨',20),(_binary 'ô,T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary 'OT<ñ)l*¨',21),(_binary 'ô{T<ñ)l*¨','main','git merge feat/login',_binary 'OT<ñ)l*¨',22),(_binary 'ô\ÊT<ñ)l*¨','feat/cart','git push origin feat/cart',_binary 'OT<ñ)l*¨',23),(_binary 'õ\ZT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary 'OT<ñ)l*¨',24),(_binary 'õiT<ñ)l*¨','main','git merge feat/profile',_binary 'OT<ñ)l*¨',25),(_binary 'õ¸T<ñ)l*¨','main','git merge feat/cart',_binary 'OT<ñ)l*¨',26),(_binary 'öT<ñ)l*¨','main','git merge feat/payment',_binary 'OT<ñ)l*¨',27),(_binary 'öVT<ñ)l*¨','main','git push origin main',_binary 'OT<ñ)l*¨',28),(_binary 'ö­T<ñ)l*¨','main','git fetch origin',_binary 'OT<ñ)l*¨',29),(_binary 'öÿT<ñ)l*¨','main','git pull origin main',_binary 'OT<ñ)l*¨',30),(_binary '\è\æT<ñ)l*¨','main','git fetch origin',_binary '\ÙT<ñ)l*¨',1),(_binary '\ëT<ñ)l*¨','main','git pull origin main',_binary '\ÙT<ñ)l*¨',2),(_binary '\ìT<ñ)l*¨','main','git status',_binary '\ÙT<ñ)l*¨',3),(_binary '\ìaT<ñ)l*¨','main','git log --oneline',_binary '\ÙT<ñ)l*¨',4),(_binary '\ì\×T<ñ)l*¨','feat/login','git add src/Login.js',_binary '\ÙT<ñ)l*¨',5),(_binary '\íLT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '\ÙT<ñ)l*¨',6),(_binary '\í\ÅT<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '\ÙT<ñ)l*¨',7),(_binary '\î:T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '\ÙT<ñ)l*¨',8),(_binary '\î«T<ñ)l*¨','main','git diff',_binary '\ÙT<ñ)l*¨',9),(_binary '\îøT<ñ)l*¨','feat/login','git add src/Auth.js',_binary '\ÙT<ñ)l*¨',10),(_binary '\ïDT<ñ)l*¨','feat/payment','git rebase main',_binary '\ÙT<ñ)l*¨',11),(_binary '\ïT<ñ)l*¨','feat/profile','git add src/Profile.js',_binary '\ÙT<ñ)l*¨',12),(_binary '\ï\ÔT<ñ)l*¨','feat/login','git commit -m \'feat: auth\'',_binary '\ÙT<ñ)l*¨',13),(_binary 'ðT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '\ÙT<ñ)l*¨',14),(_binary 'ðbT<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary '\ÙT<ñ)l*¨',15),(_binary 'ð²T<ñ)l*¨','feat/login','git push origin feat/login',_binary '\ÙT<ñ)l*¨',16),(_binary 'ðýT<ñ)l*¨','feat/profile','git add src/Avatar.js',_binary '\ÙT<ñ)l*¨',17),(_binary 'ñBT<ñ)l*¨','main','git merge feat/payment',_binary '\ÙT<ñ)l*¨',18),(_binary 'ñT<ñ)l*¨','feat/profile','git commit -m \'feat: avatar\'',_binary '\ÙT<ñ)l*¨',19),(_binary 'ñ\ÓT<ñ)l*¨','main','git merge feat/login',_binary '\ÙT<ñ)l*¨',20),(_binary 'òT<ñ)l*¨','feat/profile','git push origin feat/profile',_binary '\ÙT<ñ)l*¨',21),(_binary 'ò]T<ñ)l*¨','main','git merge feat/profile',_binary '\ÙT<ñ)l*¨',22),(_binary 'ò£T<ñ)l*¨','main','git push origin main',_binary '\ÙT<ñ)l*¨',23),(_binary 'ò\çT<ñ)l*¨','main','git fetch origin',_binary '\ÙT<ñ)l*¨',24),(_binary 'ó*T<ñ)l*¨','main','git pull origin main',_binary '\ÙT<ñ)l*¨',25),(_binary '¡T<ñ)l*¨','main','git fetch origin',_binary 'òBT<ñ)l*¨',1),(_binary '¡½T<ñ)l*¨','main','git pull origin main',_binary 'òBT<ñ)l*¨',2),(_binary '¡\Z5T<ñ)l*¨','main','git status',_binary 'òBT<ñ)l*¨',3),(_binary '¡\ZT<ñ)l*¨','main','git diff --staged',_binary 'òBT<ñ)l*¨',4),(_binary '¡\Z\ÔT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary 'òBT<ñ)l*¨',5),(_binary '¡%T<ñ)l*¨','feat/profile','git add src/Profile.js',_binary 'òBT<ñ)l*¨',6),(_binary '¡oT<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary 'òBT<ñ)l*¨',7),(_binary '¡¸T<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary 'òBT<ñ)l*¨',8),(_binary '¡T<ñ)l*¨','main','git reset --soft HEAD~1',_binary 'òBT<ñ)l*¨',9),(_binary '¡ST<ñ)l*¨','feat/payment','git add src/Checkout.js',_binary 'òBT<ñ)l*¨',10),(_binary '¡T<ñ)l*¨','feat/profile','git rebase main',_binary 'òBT<ñ)l*¨',11),(_binary '¡\àT<ñ)l*¨','feat/login','git add src/Login.js',_binary 'òBT<ñ)l*¨',12),(_binary '¡&T<ñ)l*¨','feat/payment','git commit -m \'feat: checkout\'',_binary 'òBT<ñ)l*¨',13),(_binary '¡mT<ñ)l*¨','feat/profile','git push origin feat/profile',_binary 'òBT<ñ)l*¨',14),(_binary '¡ÀT<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary 'òBT<ñ)l*¨',15),(_binary '¡T<ñ)l*¨','feat/payment','git push origin feat/payment',_binary 'òBT<ñ)l*¨',16),(_binary '¡MT<ñ)l*¨','feat/login','git add src/Auth.js',_binary 'òBT<ñ)l*¨',17),(_binary '¡\ìT<ñ)l*¨','main','git merge feat/profile',_binary 'òBT<ñ)l*¨',18),(_binary '¡6T<ñ)l*¨','feat/login','git commit -m \'fix: auth\'',_binary 'òBT<ñ)l*¨',19),(_binary '¡T<ñ)l*¨','main','git merge feat/payment',_binary 'òBT<ñ)l*¨',20),(_binary '¡\ÚT<ñ)l*¨','feat/login','git push origin feat/login',_binary 'òBT<ñ)l*¨',21),(_binary '¡ T<ñ)l*¨','main','git merge feat/login',_binary 'òBT<ñ)l*¨',22),(_binary '¡ aT<ñ)l*¨','main','git push origin main',_binary 'òBT<ñ)l*¨',23),(_binary '¡ ¤T<ñ)l*¨','main','git fetch origin',_binary 'òBT<ñ)l*¨',24),(_binary '¡ \éT<ñ)l*¨','main','git pull origin main',_binary 'òBT<ñ)l*¨',25),(_binary '§®T<ñ)l*¨','main','git fetch origin',_binary '¤r¥T<ñ)l*¨',1),(_binary '§°T<ñ)l*¨','main','git pull origin main',_binary '¤r¥T<ñ)l*¨',2),(_binary '§±T<ñ)l*¨','main','git status',_binary '¤r¥T<ñ)l*¨',3),(_binary '§±bT<ñ)l*¨','main','git cherry-pick abc123',_binary '¤r¥T<ñ)l*¨',4),(_binary '§±·T<ñ)l*¨','feat/profile','git add src/Profile.js',_binary '¤r¥T<ñ)l*¨',5),(_binary '§²T<ñ)l*¨','feat/login','git add src/Login.js',_binary '¤r¥T<ñ)l*¨',6),(_binary '§²UT<ñ)l*¨','feat/profile','git commit -m \'feat: profile\'',_binary '¤r¥T<ñ)l*¨',7),(_binary '§² T<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '¤r¥T<ñ)l*¨',8),(_binary '§²ðT<ñ)l*¨','main','git stash',_binary '¤r¥T<ñ)l*¨',9),(_binary '§³:T<ñ)l*¨','feat/profile','git add src/Avatar.js',_binary '¤r¥T<ñ)l*¨',10),(_binary '§³T<ñ)l*¨','feat/login','git rebase main',_binary '¤r¥T<ñ)l*¨',11),(_binary '§³\ÊT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '¤r¥T<ñ)l*¨',12),(_binary '§´T<ñ)l*¨','feat/profile','git commit -m \'feat: avatar\'',_binary '¤r¥T<ñ)l*¨',13),(_binary '§´XT<ñ)l*¨','feat/login','git push origin feat/login',_binary '¤r¥T<ñ)l*¨',14),(_binary '§´T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '¤r¥T<ñ)l*¨',15),(_binary '§´òT<ñ)l*¨','feat/profile','git push origin feat/profile',_binary '¤r¥T<ñ)l*¨',16),(_binary '§µ:T<ñ)l*¨','feat/payment','git add src/Checkout.js',_binary '¤r¥T<ñ)l*¨',17),(_binary '§µT<ñ)l*¨','main','git merge feat/login',_binary '¤r¥T<ñ)l*¨',18),(_binary '§µ\ÃT<ñ)l*¨','feat/payment','git commit -m \'feat: checkout\'',_binary '¤r¥T<ñ)l*¨',19),(_binary '§¶T<ñ)l*¨','main','git merge feat/profile',_binary '¤r¥T<ñ)l*¨',20),(_binary '§¶QT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '¤r¥T<ñ)l*¨',21),(_binary '§¶T<ñ)l*¨','main','git merge feat/payment',_binary '¤r¥T<ñ)l*¨',22),(_binary '§¶\ØT<ñ)l*¨','main','git push origin main',_binary '¤r¥T<ñ)l*¨',23),(_binary '§·úT<ñ)l*¨','main','git fetch origin',_binary '¤r¥T<ñ)l*¨',24),(_binary '§¸BT<ñ)l*¨','main','git pull origin main',_binary '¤r¥T<ñ)l*¨',25),(_binary '¬þ\ìT<ñ)l*¨','main','git fetch origin',_binary '©¸_T<ñ)l*¨',1),(_binary '­XT<ñ)l*¨','main','git pull origin main',_binary '©¸_T<ñ)l*¨',2),(_binary '­\ÊT<ñ)l*¨','main','git status',_binary '©¸_T<ñ)l*¨',3),(_binary '­T<ñ)l*¨','main','git log --oneline',_binary '©¸_T<ñ)l*¨',4),(_binary '­\ÔT<ñ)l*¨','feat/login','git add src/Login.js',_binary '©¸_T<ñ)l*¨',5),(_binary '­!T<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '©¸_T<ñ)l*¨',6),(_binary '­lT<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '©¸_T<ñ)l*¨',7),(_binary '­¹T<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '©¸_T<ñ)l*¨',8),(_binary '­T<ñ)l*¨','feat/login','git add src/Auth.js',_binary '©¸_T<ñ)l*¨',9),(_binary '­QT<ñ)l*¨','feat/payment','git add src/Checkout.js',_binary '©¸_T<ñ)l*¨',10),(_binary '­T<ñ)l*¨','feat/login','git commit -m \'feat: auth\'',_binary '©¸_T<ñ)l*¨',11),(_binary '­/T<ñ)l*¨','feat/payment','git commit -m \'feat: checkout\'',_binary '©¸_T<ñ)l*¨',12),(_binary '­\çT<ñ)l*¨','feat/payment','git rebase main',_binary '©¸_T<ñ)l*¨',13),(_binary '­T<ñ)l*¨','feat/login','git push origin feat/login',_binary '©¸_T<ñ)l*¨',14),(_binary '­uT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '©¸_T<ñ)l*¨',15),(_binary '­\ÆT<ñ)l*¨','main','git merge feat/login',_binary '©¸_T<ñ)l*¨',16),(_binary '­T<ñ)l*¨','main','git merge feat/payment',_binary '©¸_T<ñ)l*¨',17),(_binary '­\\T<ñ)l*¨','main','git push origin main',_binary '©¸_T<ñ)l*¨',18),(_binary '­¥T<ñ)l*¨','main','git fetch origin',_binary '©¸_T<ñ)l*¨',19),(_binary '­\íT<ñ)l*¨','main','git pull origin main',_binary '©¸_T<ñ)l*¨',20),(_binary '´8T<ñ)l*¨','main','git fetch origin',_binary '¯üT<ñ)l*¨',1),(_binary '´;%T<ñ)l*¨','main','git pull origin main',_binary '¯üT<ñ)l*¨',2),(_binary '´;ªT<ñ)l*¨','main','git diff',_binary '¯üT<ñ)l*¨',3),(_binary '´;üT<ñ)l*¨','main','git reset --soft HEAD~1',_binary '¯üT<ñ)l*¨',4),(_binary '´<ET<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '¯üT<ñ)l*¨',5),(_binary '´<T<ñ)l*¨','feat/login','git add src/Login.js',_binary '¯üT<ñ)l*¨',6),(_binary '´<\ÙT<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '¯üT<ñ)l*¨',7),(_binary '´=#T<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '¯üT<ñ)l*¨',8),(_binary '´=eT<ñ)l*¨','feat/payment','git add src/Checkout.js',_binary '¯üT<ñ)l*¨',9),(_binary '´=¬T<ñ)l*¨','feat/login','git add src/Auth.js',_binary '¯üT<ñ)l*¨',10),(_binary '´=òT<ñ)l*¨','feat/payment','git commit -m \'feat: checkout\'',_binary '¯üT<ñ)l*¨',11),(_binary '´>4T<ñ)l*¨','feat/login','git commit -m \'fix: auth\'',_binary '¯üT<ñ)l*¨',12),(_binary '´>vT<ñ)l*¨','feat/login','git rebase main',_binary '¯üT<ñ)l*¨',13),(_binary '´>·T<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '¯üT<ñ)l*¨',14),(_binary '´?T<ñ)l*¨','feat/login','git push origin feat/login',_binary '¯üT<ñ)l*¨',15),(_binary '´?JT<ñ)l*¨','main','git merge feat/payment',_binary '¯üT<ñ)l*¨',16),(_binary '´?T<ñ)l*¨','main','git merge feat/login',_binary '¯üT<ñ)l*¨',17),(_binary '´?\ÍT<ñ)l*¨','main','git push origin main',_binary '¯üT<ñ)l*¨',18),(_binary '´@T<ñ)l*¨','main','git fetch origin',_binary '¯üT<ñ)l*¨',19),(_binary '´@PT<ñ)l*¨','main','git pull origin main',_binary '¯üT<ñ)l*¨',20),(_binary 'º}T<ñ)l*¨','main','git fetch origin',_binary '¶QT<ñ)l*¨',1),(_binary 'º\ãT<ñ)l*¨','main','git pull origin main',_binary '¶QT<ñ)l*¨',2),(_binary 'º`T<ñ)l*¨','main','git status',_binary '¶QT<ñ)l*¨',3),(_binary 'º¶T<ñ)l*¨','main','git cherry-pick abc123',_binary '¶QT<ñ)l*¨',4),(_binary 'ºÿT<ñ)l*¨','feat/login','git add src/Login.js',_binary '¶QT<ñ)l*¨',5),(_binary 'ºHT<ñ)l*¨','feat/payment','git add src/Payment.js',_binary '¶QT<ñ)l*¨',6),(_binary 'ºT<ñ)l*¨','feat/login','git commit -m \'feat: login\'',_binary '¶QT<ñ)l*¨',7),(_binary 'º\ÚT<ñ)l*¨','feat/payment','git commit -m \'feat: payment\'',_binary '¶QT<ñ)l*¨',8),(_binary 'ºT<ñ)l*¨','feat/login','git rebase main',_binary '¶QT<ñ)l*¨',9),(_binary 'ºbT<ñ)l*¨','feat/payment','git add src/Checkout.js',_binary '¶QT<ñ)l*¨',10),(_binary 'º«T<ñ)l*¨','feat/login','git add src/Auth.js',_binary '¶QT<ñ)l*¨',11),(_binary 'º\íT<ñ)l*¨','feat/payment','git commit -m \'feat: checkout\'',_binary '¶QT<ñ)l*¨',12),(_binary 'º2T<ñ)l*¨','feat/login','git commit -m \'fix: auth\'',_binary '¶QT<ñ)l*¨',13),(_binary 'ºyT<ñ)l*¨','feat/login','git push origin feat/login',_binary '¶QT<ñ)l*¨',14),(_binary 'º\ÆT<ñ)l*¨','feat/payment','git push origin feat/payment',_binary '¶QT<ñ)l*¨',15),(_binary 'ºT<ñ)l*¨','main','git merge feat/login',_binary '¶QT<ñ)l*¨',16),(_binary 'ºNT<ñ)l*¨','main','git merge feat/payment',_binary '¶QT<ñ)l*¨',17),(_binary 'ºT<ñ)l*¨','main','git push origin main',_binary '¶QT<ñ)l*¨',18),(_binary 'º\ÑT<ñ)l*¨','main','git fetch origin',_binary '¶QT<ñ)l*¨',19),(_binary 'ºT<ñ)l*¨','main','git pull origin main',_binary '¶QT<ñ)l*¨',20);
/*!40000 ALTER TABLE `competitive_command_set_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competitive_ranking`
--

DROP TABLE IF EXISTS `competitive_ranking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competitive_ranking` (
  `competitive_ranking_id` binary(16) NOT NULL,
  `member_id` binary(16) NOT NULL,
  `mode` enum('CONTRIBUTION','TIME_ATTACK') NOT NULL,
  `rank` int NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  `score` int NOT NULL,
  `play_count` int NOT NULL DEFAULT '0',
  `week` varchar(10) NOT NULL,
  PRIMARY KEY (`competitive_ranking_id`),
  UNIQUE KEY `uq_competitive_ranking` (`member_id`,`mode`,`week`),
  KEY `idx_competitive_ranking_mode_week_rank` (`mode`,`week`,`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competitive_ranking`
--

LOCK TABLES `competitive_ranking` WRITE;
/*!40000 ALTER TABLE `competitive_ranking` DISABLE KEYS */;
/*!40000 ALTER TABLE `competitive_ranking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contribution_result`
--

DROP TABLE IF EXISTS `contribution_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contribution_result` (
  `contribution_result_id` binary(16) NOT NULL,
  `played_at` datetime(6) NOT NULL,
  `room_id` bigint NOT NULL,
  `session_id` varchar(100) NOT NULL,
  PRIMARY KEY (`contribution_result_id`),
  UNIQUE KEY `uq_contribution_result_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contribution_result`
--

LOCK TABLES `contribution_result` WRITE;
/*!40000 ALTER TABLE `contribution_result` DISABLE KEYS */;
/*!40000 ALTER TABLE `contribution_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contribution_result_member`
--

DROP TABLE IF EXISTS `contribution_result_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contribution_result_member` (
  `contribution_result_member_id` binary(16) NOT NULL,
  `contribution` int NOT NULL,
  `contribution_result_id` binary(16) NOT NULL,
  `member_id` binary(16) NOT NULL,
  PRIMARY KEY (`contribution_result_member_id`),
  UNIQUE KEY `uq_contribution_result_member` (`contribution_result_id`,`member_id`),
  KEY `idx_contribution_result_member_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contribution_result_member`
--

LOCK TABLES `contribution_result_member` WRITE;
/*!40000 ALTER TABLE `contribution_result_member` DISABLE KEYS */;
/*!40000 ALTER TABLE `contribution_result_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coop_command_set_item`
--

DROP TABLE IF EXISTS `coop_command_set_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coop_command_set_item` (
  `coop_command_set_item_id` binary(16) NOT NULL,
  `coop_map_id` binary(16) NOT NULL,
  `command_text` varchar(255) NOT NULL,
  `round` int NOT NULL,
  `sequence` int NOT NULL,
  PRIMARY KEY (`coop_command_set_item_id`),
  UNIQUE KEY `uq_coop_command_set_item` (`coop_map_id`,`round`,`sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coop_command_set_item`
--

LOCK TABLES `coop_command_set_item` WRITE;
/*!40000 ALTER TABLE `coop_command_set_item` DISABLE KEYS */;
INSERT INTO `coop_command_set_item` VALUES (_binary '\ë[T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git init',1,1),(_binary '\î¿T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git add README.md',1,2),(_binary '\ï\íT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git commit -m \"chore: init project\"',1,3),(_binary 'ðT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git push -u origin main',1,4),(_binary 'ñsT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git remote add origin https://github.com/team/project.git',2,1),(_binary 'ñÿT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git fetch origin',2,2),(_binary 'ò|T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git merge origin/main',2,3),(_binary 'ó	T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git push origin main',2,4),(_binary 'óT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git pull origin main',3,1),(_binary 'óùT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git add src/login.js',3,2),(_binary 'ôlT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git commit -m \"feat: add login\"',3,3),(_binary 'ô\âT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git push origin main',3,4),(_binary 'õ[T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git fetch origin',4,1),(_binary 'õ\ÚT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git merge origin/main',4,2),(_binary 'ö[T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git add .',4,3),(_binary 'ö\ÊT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git commit -m \"merge: resolve conflict\"',4,4),(_binary '÷OT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git add src/hotfix.js',5,1),(_binary '÷\ÎT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git commit -m \"fix: critical hotfix\"',5,2),(_binary 'øJT<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git tag -a v1.0.0 -m \"Release v1.0.0\"',5,3),(_binary 'ø¼T<ñ)l*¨',_binary '_\Ï\äzPñÿ\"£Û\Ù','git push origin main --tags',5,4),(_binary 'MT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git remote add origin https://github.com/team/project.git',1,1),(_binary '\ÌT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git fetch origin',1,2),(_binary 'rT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git merge origin/main',1,3),(_binary '\ìT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git push -u origin main',1,4),(_binary 'hT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git pull origin main',2,1),(_binary '\áT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git add src/index.js',2,2),(_binary 'YT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git commit -m \"feat: add index\"',2,3),(_binary '\ÓT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git push origin main',2,4),(_binary '	MT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git fetch origin',3,1),(_binary '	¿T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git log origin/main --oneline',3,2),(_binary '\n5T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git merge origin/main',3,3),(_binary '\n¨T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git push origin main',3,4),(_binary 'T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git pull origin main',4,1),(_binary 'T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git add src/feature.js',4,2),(_binary 'T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git commit -m \"feat: add feature\"',4,3),(_binary 'yT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git push origin main',4,4),(_binary 'ðT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git fetch origin',5,1),(_binary '\reT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git merge origin/main',5,2),(_binary '\r\×T<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git tag -a v1.0.0 -m \"Release v1.0.0\"',5,3),(_binary 'PT<ñ)l*¨',_binary '_\Ñr\ØPñÿ\"£Û\Ù','git push origin main --tags',5,4),(_binary 'BT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git pull origin main',1,1),(_binary 'ET<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git checkout -b feature/login',1,2),(_binary 'ErT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git add src/login.js',1,3),(_binary 'E\ÂT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git commit -m \"feat: add login page\"',1,4),(_binary 'FT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git fetch origin',2,1),(_binary 'FbT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git rebase origin/main',2,2),(_binary 'F¨T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git add src/signup.js',2,3),(_binary 'FðT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git commit -m \"feat: add signup page\"',2,4),(_binary 'G:T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git fetch origin',3,1),(_binary 'GT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git add src/auth.js',3,2),(_binary 'G\ËT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git commit -m \"feat: complete auth module\"',3,3),(_binary 'HT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git push origin feature/login',3,4),(_binary 'H]T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git checkout main',4,1),(_binary 'H£T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git pull origin main',4,2),(_binary 'H\éT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git merge --no-ff feature/login',4,3),(_binary 'I5T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git push origin main',4,4),(_binary 'I}T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git checkout main',5,1),(_binary 'I\ÂT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git branch -d feature/login',5,2),(_binary 'J	T<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git push origin --delete feature/login',5,3),(_binary 'JPT<ñ)l*¨',_binary '_\Ò\åPñÿ\"£Û\Ù','git fetch --prune',5,4),(_binary '@\äT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git stash',1,1),(_binary 'BT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git checkout -b hotfix/critical',1,2),(_binary 'CT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git add src/critical-fix.js',1,3),(_binary 'CQT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git commit -m \"fix: resolve critical bug\"',1,4),(_binary 'C¥T<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git log hotfix/critical --oneline',2,1),(_binary 'C\ïT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git checkout main',2,2),(_binary 'D6T<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git cherry-pick hotfix/critical',2,3),(_binary 'DT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git push origin main',2,4),(_binary 'D\ÊT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git checkout -b feature/payment',3,1),(_binary 'ET<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git add src/payment.js',3,2),(_binary 'EXT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git commit -m \"feat: add payment module\"',3,3),(_binary 'ET<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git push origin feature/payment',3,4),(_binary 'E\æT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git fetch origin',4,1),(_binary 'F.T<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git checkout feature/payment',4,2),(_binary 'FsT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git rebase origin/main',4,3),(_binary 'F¾T<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git push --force-with-lease origin feature/payment',4,4),(_binary 'GT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git checkout main',5,1),(_binary 'GMT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git merge --no-ff feature/payment',5,2),(_binary 'GT<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git tag -a v1.0.0 -m \"Release v1.0.0\"',5,3),(_binary 'G\×T<ñ)l*¨',_binary '_ÔªPñÿ\"£Û\Ù','git push origin main --tags',5,4),(_binary '¤ðT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git stash',1,1),(_binary '¦T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git checkout main',1,2),(_binary '§T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git pull origin main',1,3),(_binary '§ST<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git stash pop',1,4),(_binary '§¨T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git reflog',2,1),(_binary '§òT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git checkout HEAD@{3}',2,2),(_binary '¨>T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git checkout -b recovery/lost-work',2,3),(_binary '¨T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git push origin recovery/lost-work',2,4),(_binary '¨\ÓT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git log --oneline -6',3,1),(_binary '©\ZT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git rebase -i HEAD~4',3,2),(_binary '©aT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git log --oneline',3,3),(_binary '©¨T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git push --force-with-lease origin feature/clean',3,4),(_binary '©ñT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git submodule add https://github.com/team/utils.git libs/utils',4,1),(_binary 'ª;T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git add .gitmodules libs/utils',4,2),(_binary 'ªT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git commit -m \"chore: add utils submodule\"',4,3),(_binary 'ª\ËT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git push origin main',4,4),(_binary '«T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git checkout main',5,1),(_binary '«\\T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git pull origin main',5,2),(_binary '«£T<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git tag -s v2.0.0 -m \"Signed Release v2.0.0\"',5,3),(_binary '«\éT<ñ)l*¨',_binary '_\Ö6HPñÿ\"£Û\Ù','git push origin v2.0.0',5,4);
/*!40000 ALTER TABLE `coop_command_set_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coop_map`
--

DROP TABLE IF EXISTS `coop_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coop_map` (
  `coop_map_id` binary(16) NOT NULL,
  `difficulty` int NOT NULL,
  `graph_picture` longtext,
  `is_active` bit(1) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`coop_map_id`),
  UNIQUE KEY `uq_coop_map_name_difficulty` (`name`,`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coop_map`
--

LOCK TABLES `coop_map` WRITE;
/*!40000 ALTER TABLE `coop_map` DISABLE KEYS */;
INSERT INTO `coop_map` VALUES (_binary '_\Ï\äzPñÿ\"£Û\Ù',1,NULL,_binary '','ê¸°ì´ ì²','2026-05-20 20:10:39.923105','2026-05-20 20:10:39.923105'),(_binary '_\Ñr\ØPñÿ\"£Û\Ù',2,NULL,_binary '','ìê²© ì ì¥ì','2026-05-20 20:10:39.923105','2026-05-20 20:10:39.923105'),(_binary '_\Ò\åPñÿ\"£Û\Ù',3,NULL,_binary '','ë¸ëì¹ íì','2026-05-20 20:10:39.923105','2026-05-20 20:10:39.923105'),(_binary '_ÔªPñÿ\"£Û\Ù',4,NULL,_binary '','ê³ ê¸ íì í¨í´','2026-05-20 20:10:39.923105','2026-05-20 20:10:39.923105'),(_binary '_\Ö6HPñÿ\"£Û\Ù',5,NULL,_binary '','ì ë¬¸ê° í¨í´','2026-05-20 20:10:39.923105','2026-05-20 20:10:39.923105');
/*!40000 ALTER TABLE `coop_map` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coop_ranking`
--

DROP TABLE IF EXISTS `coop_ranking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coop_ranking` (
  `coop_ranking_id` binary(16) NOT NULL,
  `elapsed_time` int NOT NULL,
  `total_wrong_type_count` int NOT NULL DEFAULT '0',
  `total_wrong_order_count` int NOT NULL DEFAULT '0',
  `coop_result_id` binary(16) NOT NULL,
  `difficulty` int NOT NULL,
  `team_name` varchar(100) NOT NULL DEFAULT 'TEAM',
  `map_name` varchar(100) NOT NULL,
  `rank` int NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  `week` varchar(10) NOT NULL,
  PRIMARY KEY (`coop_ranking_id`),
  UNIQUE KEY `uq_coop_ranking` (`coop_result_id`),
  KEY `idx_coop_ranking_difficulty_week_rank` (`difficulty`,`week`,`rank`),
  KEY `idx_coop_ranking_map_name_week_rank` (`map_name`,`week`,`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coop_ranking`
--

LOCK TABLES `coop_ranking` WRITE;
/*!40000 ALTER TABLE `coop_ranking` DISABLE KEYS */;
/*!40000 ALTER TABLE `coop_ranking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coop_result`
--

DROP TABLE IF EXISTS `coop_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coop_result` (
  `coop_result_id` binary(16) NOT NULL,
  `elapsed_time` int NOT NULL,
  `total_wrong_type_count` int NOT NULL DEFAULT '0',
  `total_wrong_order_count` int NOT NULL DEFAULT '0',
  `difficulty` int NOT NULL,
  `map_name` varchar(100) NOT NULL,
  `played_at` datetime(6) NOT NULL,
  `room_id` bigint NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  PRIMARY KEY (`coop_result_id`),
  UNIQUE KEY `uq_coop_result_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coop_result`
--

LOCK TABLES `coop_result` WRITE;
/*!40000 ALTER TABLE `coop_result` DISABLE KEYS */;
/*!40000 ALTER TABLE `coop_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coop_result_member`
--

DROP TABLE IF EXISTS `coop_result_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coop_result_member` (
  `coop_result_member_id` binary(16) NOT NULL,
  `coop_result_id` binary(16) NOT NULL,
  `member_id` binary(16) NOT NULL,
  `wrong_type_count` int NOT NULL DEFAULT '0',
  `wrong_order_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`coop_result_member_id`),
  UNIQUE KEY `uq_coop_result_member` (`coop_result_id`,`member_id`),
  KEY `idx_coop_result_member_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coop_result_member`
--

LOCK TABLES `coop_result_member` WRITE;
/*!40000 ALTER TABLE `coop_result_member` DISABLE KEYS */;
/*!40000 ALTER TABLE `coop_result_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dictionary_command`
--

DROP TABLE IF EXISTS `dictionary_command`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dictionary_command` (
  `dictionary_command_id` binary(16) NOT NULL,
  `description` text,
  `example` varchar(500) DEFAULT NULL,
  `is_in_game` bit(1) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tip` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`dictionary_command_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dictionary_command`
--

LOCK TABLES `dictionary_command` WRITE;
/*!40000 ALTER TABLE `dictionary_command` DISABLE KEYS */;
INSERT INTO `dictionary_command` VALUES (_binary '~\Ð\æ¬JÁñ¶jF\ï\\ix','ìê²© ì ì¥ìë¥¼ ë¡ì»¬ì ë³µì í©ëë¤.','git clone https://github.com/user/repo.git',_binary '','git clone','--depth 1 ìµìì ì°ë©´ ì ì²´ íì¤í ë¦¬ ìì´ ìµì  ì»¤ë°ë§ ë°ìì ìëê° ë¹ ë¦ëë¤. ëí ì ì¥ììì ì ì©í©ëë¤.'),(_binary '~\Ð\é\èJÁñ¶jF\ï\\ix','ë³ê²½ë íì¼ì ì¤íì´ì§ ìì­ì ì¶ê°í©ëë¤.','git add src/Main.js',_binary '','git add','git add .ì í¸ë¦¬íì§ë§ ìëì¹ ìì íì¼ê¹ì§ ì¤íì´ì§ë  ì ììµëë¤. git add -pë¡ ë³ê²½ì¬í­ì ì§ì  íì¸íë©° ì¤íì´ì§íë ìµê´ì ë¤ì´ì¸ì.'),(_binary '~\Ð\ê¼JÁñ¶jF\ï\\ix','ì¤íì´ì§ë ë³ê²½ì¬í­ì ë¡ì»¬ ì ì¥ìì ì ì¥í©ëë¤.','git commit -m \"feat: add login page\"',_binary '','git commit','ì»¤ë° ë©ìì§ë feat:, fix:, chore: ê°ì prefixë¥¼ ë¶ì´ë Conventional Commits ê·ì¹ì ë°ë¥´ë©´ íì¤í ë¦¬ ê´ë¦¬ê° í¸í´ì§ëë¤.'),(_binary '~\Ð\ëJÁñ¶jF\ï\\ix','ë¡ì»¬ ì»¤ë°ì ìê²© ì ì¥ìì ìë¡ëí©ëë¤.','git push origin feat/login',_binary '','git push','ê³µì  ë¸ëì¹(main, develop)ìë --force ìì´ pushíë ê²ì´ ìì¹ìëë¤. forceê° íìíë¤ë©´ --force-with-leaseë¥¼ ì°ì¸ì.'),(_binary '~\Ð\ë_JÁñ¶jF\ï\\ix','ìê²© ì ì¥ìì ë³ê²½ì¬í­ì ë¡ì»¬ì ë´ë ¤ë°ê³  ë³í©í©ëë¤.','git pull origin main',_binary '','git pull','ê¸°ë³¸ ëìì´ mergeë¼ ë¶íìí merge ì»¤ë°ì´ ìê¹ëë¤. git pull --rebaseë¥¼ ì°ë©´ íì¤í ë¦¬ë¥¼ ê¹ëíê² ì ì§í  ì ììµëë¤.'),(_binary '~\Ð\ë©JÁñ¶jF\ï\\ix','ìê²© ì ì¥ìì ë³ê²½ì¬í­ì ë¡ì»¬ì ë´ë ¤ë°ê¸°ë§ í©ëë¤. ë³í©ì íì§ ììµëë¤.','git fetch origin',_binary '','git fetch','git pullì fetch + mergeë¥¼ í ë²ì ìíí©ëë¤. ë³ê²½ì¬í­ì ë¨¼ì  íì¸íê³  ì¶ë¤ë©´ git fetch í git diff origin/mainì¼ë¡ íì¸íì¸ì.'),(_binary '~\Ð\ëðJÁñ¶jF\ï\\ix','ë¤ë¥¸ ë¸ëì¹ì ë³ê²½ì¬í­ì íì¬ ë¸ëì¹ì ë³í©í©ëë¤.','git merge feat/login',_binary '','git merge','Fast-forwardê° ê°ë¥í ìí©ììë --no-ff ìµìì ì°ë©´ merge ì»¤ë°ì´ ë¨ì ë¸ëì¹ ìì íì ì ë³´ì¡´í  ì ììµëë¤.'),(_binary '~\Ð\ìJÁñ¶jF\ï\\ix','ë¤ë¥¸ ë¸ëì¹ë¡ ì´ëí©ëë¤.','git switch main',_binary '','git switch','Git 2.23ë¶í° git checkoutì ë¸ëì¹ ì í ê¸°ë¥ì´ git switchë¡ ë¶ë¦¬ëìµëë¤. ìì¼ë¡ë git switchë¥¼ ì°ë ê²ì ê¶ì¥í©ëë¤.'),(_binary '~\Ð\íJÁñ¶jF\ï\\ix','ìë¡ì´ ë¸ëì¹ë¥¼ ìì±íê³  ì´ëí©ëë¤.','git switch -c feat/login',_binary '','git switch -c','git checkout -b <ë¸ëì¹ëª>ê³¼ ëì¼í ëììëë¤. Git 2.23 ì´ìì´ë¼ë©´ git switch -cë¥¼ ì°ì¸ì.'),(_binary '~\Ð\í{JÁñ¶jF\ï\\ix','íì¬ ë¸ëì¹ì ì»¤ë°ì ëì ë¸ëì¹ ìë¡ ì¬ë°°ì¹í©ëë¤.','git rebase main',_binary '','git rebase','ì´ë¯¸ ìê²©ì pushí ë¸ëì¹ì rebaseë¥¼ íë©´ íì¤í ë¦¬ê° ë¬ë¼ì ¸ íììê² í¼ëì ì¤ëë¤. rebaseë ë¡ì»¬ ìì ì¤ìë§ ì¬ì©íì¸ì.'),(_binary '~\Ð\í\èJÁñ¶jF\ï\\ix','ìê²© ì ì¥ìì íì¤í ë¦¬ë¥¼ ë¡ì»¬ ê¸°ì¤ì¼ë¡ ê°ì  ë®ì´ìëë¤.','git push --force origin feat/login',_binary '','git push --force','--force ëì  --force-with-leaseë¥¼ ì°ë©´ ìê²©ì ë´ê° ëª¨ë¥´ë ì»¤ë°ì´ ìì ë pushë¥¼ ë§ìì¤ì ìì í©ëë¤.'),(_binary '~\Ð\îBJÁñ¶jF\ï\\ix','ë³ê²½ë ë´ì©ì ì°¨ì´ë¥¼ ë¹êµí©ëë¤.','git diff main',_binary '','git diff','git diff --stagedë¡ ì¤íì´ì§ë ë³ê²½ì¬í­ë§ ë°ë¡ íì¸í  ì ììµëë¤. ì»¤ë° ì  ìµì¢ ê²í  ìµê´ì¼ë¡ ì°ë©´ ì¢ìµëë¤.'),(_binary '~\Ð\îJÁñ¶jF\ï\\ix','ìë¡ì´ Git ì ì¥ìë¥¼ ì´ê¸°íí©ëë¤.','git init',_binary '\0','git init','git init í ì²« ì»¤ë° ì ì .gitignoreë¥¼ ë¨¼ì  ì¤ì íì¸ì. ëì¤ì ì¶ê°íë©´ ì´ë¯¸ ì¶ì ë íì¼ì ë³ëë¡ ì ê±°í´ì¼ í©ëë¤.'),(_binary '~\Ð\î\ÊJÁñ¶jF\ï\\ix','íì¬ ìì ëë í ë¦¬ì ë³ê²½ ìíë¥¼ íì¸í©ëë¤.','git status -s',_binary '','git status','git status -së¡ ê°ëµíê² íì¸í  ì ììµëë¤. Mì ìì , Aë ì¤íì´ì§, ?ë ë¯¸ì¶ì  íì¼ì ìë¯¸í©ëë¤.'),(_binary '~\Ð\ïJÁñ¶jF\ï\\ix','ì»¤ë° íì¤í ë¦¬ë¥¼ ì¡°íí©ëë¤.','git log --oneline --graph --all',_binary '','git log','git log --oneline --graph --allì ì°ë©´ ì ì²´ ë¸ëì¹ì ë¶ê¸° êµ¬ì¡°ë¥¼ íëì ë³¼ ì ììµëë¤. aliasë¡ ë±ë¡í´ëë©´ í¸í©ëë¤.'),(_binary '~\Ð\ïYJÁñ¶jF\ï\\ix','íì¬ ë³ê²½ì¬í­ì ììë¡ ì ì¥íê³  ìì ëë í ë¦¬ë¥¼ ê¹¨ëíê² ë§ë­ëë¤.','git stash pop',_binary '','git stash','git stash popì stashë¥¼ êº¼ë´ê³  ëª©ë¡ìì ì­ì í©ëë¤. ì¬ë¬ ê³³ì ì ì©íê³  ì¶ë¤ë©´ git stash applyë¥¼ ì°ì¸ì.'),(_binary '~\Ð\ï¥JÁñ¶jF\ï\\ix','ì»¤ë°ì´ë ì¤íì´ì§ì ëëë¦½ëë¤.','git reset --soft HEAD~1',_binary '','git reset','--hardë ë³ê²½ì¬í­ì´ ìì í ì­ì ë¼ ë³µêµ¬ê° ì´ë µìµëë¤. ì»¤ë°ë§ ì·¨ìíê³  ë³ê²½ì¬í­ì ë¨ê¸°ë ¤ë©´ --softë¥¼ ì°ì¸ì.'),(_binary '~\Ð\ï\êJÁñ¶jF\ï\\ix','ìì ëë í ë¦¬ì íì¼ì ëëë¦½ëë¤.','git restore src/Main.js',_binary '','git restore','Git 2.23ë¶í° git checkout -- <íì¼ëª>ì íì¼ ë³µêµ¬ ê¸°ë¥ì´ git restoreë¡ ë¶ë¦¬ëìµëë¤. ìì¼ë¡ë git restoreë¥¼ ì°ì¸ì.'),(_binary '~\Ðð)JÁñ¶jF\ï\\ix','ë¸ëì¹ ëª©ë¡ì ì¡°ííê±°ë ë¸ëì¹ë¥¼ ìì±Â·ì­ì í©ëë¤.','git branch -d feat/login',_binary '\0','git branch','ë³í©ì´ ìë£ë ë¸ëì¹ë git branch -dë¡ ì ë¦¬íë ìµê´ì ë¤ì´ì¸ì. ìê²© ë¸ëì¹ë git push origin --delete <ë¸ëì¹ëª>ì¼ë¡ ì­ì í©ëë¤.'),(_binary '~\ÐðiJÁñ¶jF\ï\\ix','í¹ì  ì»¤ë°ë§ ê³¨ë¼ íì¬ ë¸ëì¹ì ì ì©í©ëë¤.','git cherry-pick a1b2c3d',_binary '','git cherry-pick','í¹ì  ì»¤ë°ë§ ê°ì ¸ì¬ ë ì ì©íì§ë§ ë¨ì©íë©´ íì¤í ë¦¬ê° ë³µì¡í´ì§ëë¤. ë¸ëì¹ ì ì²´ë¥¼ í©ì¹  ëë mergeë rebaseë¥¼ ì°ì¸ì.'),(_binary 'ô4T<ñ)l*¨','í¹ì  ì»¤ë°ì ëëë¦¬ë ì ì»¤ë°ì ë§ë­ëë¤.','git revert HEAD',_binary '\0','git revert','resetê³¼ ë¬ë¦¬ íì¤í ë¦¬ë¥¼ ë³´ì¡´í´ ê³µì  ë¸ëì¹ìì ìì í©ëë¤. ì´ë¯¸ pushí ì»¤ë°ì ëëë¦´ ë revertë¥¼ ì°ì¸ì.'),(_binary ' Z\éT<ñ)l*¨','í¹ì  ì»¤ë°ì´ë ê°ì²´ì ë´ì©ì ë´ëë¤.','git show abc1234',_binary '','git show','git show HEADë ê°ì¥ ìµê·¼ ì»¤ë°ì ë³ê²½ì¬í­ì ë³´ì¬ì¤ëë¤. git log -pì ë¹ì·íì§ë§ ë¨ì¼ ì»¤ë°ì ì§ì¤í©ëë¤.'),(_binary '\"T<ñ)l*¨','ìê²© ì ì¥ìì ë³ì¹­ì ê´ë¦¬í©ëë¤. ì¶ê°, ì¡°í, ì­ì , ì´ë¦ ë³ê²½ì´ ê°ë¥í©ëë¤.','git remote -v',_binary '\0','git remote','í íë¡ì í¸ì ì¬ë¬ ìê²©(origin, upstream)ì ëë ê² íí©ëë¤. forkí ì ì¥ìë¼ë©´ ìë³¸ì upstreamì¼ë¡ ë±ë¡í´ëë©´ ëê¸°íê° ì¬ìì§ëë¤.'),(_binary '$~T<ñ)l*¨','ë¸ëì¹ë¥¼ ì ííê±°ë í¹ì  ì»¤ë°ì íì¼ì ê°ì ¸ìµëë¤. Git 2.23ë¶í° switch/restoreë¡ ë¶ë¦¬ëì§ë§ ì¬ì í ìì£¼ ì°ìëë¤. íì¬ íì´í ê²ìììë ë¸ëì¹ ì´ë ëªë ¹ì´ë¡ switchë§ ì¸ì íê³  ììµëë¤.','git checkout main',_binary '\0','git checkout','ë¸ëì¹ ì íì git switch, íì¼ ë³µêµ¬ë git restoreê° ì ììëë¤. ì´ì  ìë£ìì í¸íì ìí´ checkoutë ììëì¸ì.'),(_binary '&x\ÇT<ñ)l*¨','í¹ì  ì»¤ë°ì ì´ë¦íë¥¼ ë¶ì¬ ë²ì ì´ë ë¦´ë¦¬ì¦ ì§ì ì íìí©ëë¤.','git tag v1.0.0',_binary '','git tag','ë¦´ë¦¬ì¦ ë²ì ì v1.0.0ì²ë¼ íê·¸ë¡ ë¨ê²¨ëë©´ ëì¤ì í´ë¹ ìì ì ì½ëë¥¼ ì½ê² ì°¾ì ì ììµëë¤. ê³µì ê° íìíë©´ íê·¸ ìì± í git push origin <íê·¸ëª>ì¼ë¡ ìê²©ì ì¬ë ¤ì¼ í©ëë¤.'),(_binary '(¤T<ñ)l*¨','HEADê° ì´ëí ê¸°ë¡ì ìê°ìì¼ë¡ ë³´ì¬ì¤ëë¤.','git reflog',_binary '','git reflog','reset, checkout, commit amendì²ë¼ ë¸ëì¹ ìì¹ê° ë°ë ê¸°ë¡ë ë¨ìµëë¤. ì¤ìë¡ ì»¤ë°ì ìì´ë²ë ¸ì ë ë³µêµ¬í  ì»¤ë° í´ìë¥¼ ì°¾ë ë° ì ì©í©ëë¤.'),(_binary '*¨\ÍT<ñ)l*¨','ë¤ë¥¸ Git ì ì¥ìë¥¼ íì¬ ì ì¥ìì íì ëë í ë¦¬ë¡ ì°ê²°í´ ê´ë¦¬í©ëë¤.','git submodule add https://github.com/user/lib.git libs/lib',_binary '','git submodule','ê³µíµ ë¼ì´ë¸ë¬ë¦¬ë ì¸ë¶ íë¡ì í¸ë¥¼ ë³ë ì ì¥ìë¡ ì ì§íë©´ì í¨ê» ì¬ì©í  ë ìëë¤. clone íìë submodule init/updateê° íìí  ì ììµëë¤.');
/*!40000 ALTER TABLE `dictionary_command` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dictionary_command_option`
--

DROP TABLE IF EXISTS `dictionary_command_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dictionary_command_option` (
  `dictionary_command_option_id` binary(16) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `option` varchar(100) NOT NULL,
  `dictionary_command_id` binary(16) NOT NULL,
  PRIMARY KEY (`dictionary_command_option_id`),
  KEY `fk_dictionary_command_option` (`dictionary_command_id`),
  CONSTRAINT `fk_dictionary_command_option` FOREIGN KEY (`dictionary_command_id`) REFERENCES `dictionary_command` (`dictionary_command_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dictionary_command_option`
--

LOCK TABLES `dictionary_command_option` WRITE;
/*!40000 ALTER TABLE `dictionary_command_option` DISABLE KEYS */;
INSERT INTO `dictionary_command_option` VALUES (_binary '~\Ô^JÁñ¶jF\ï\\ix','ìµì  ì»¤ë° 1ê°ë§ ê°ì ¸ì ìì ë³µì ë¥¼ ìíí©ëë¤.','--depth 1',_binary '~\Ð\æ¬JÁñ¶jF\ï\\ix'),(_binary '~\Ôb\ßJÁñ¶jF\ï\\ix','íì¬ ëë í ë¦¬ì ëª¨ë  ë³ê²½ì¬í­ì ì¤íì´ì§í©ëë¤.','.',_binary '~\Ð\é\èJÁñ¶jF\ï\\ix'),(_binary '~\Ôd¬JÁñ¶jF\ï\\ix','ë³ê²½ì¬í­ì ëííì¼ë¡ ì íí´ ì¤íì´ì§í©ëë¤.','-p',_binary '~\Ð\é\èJÁñ¶jF\ï\\ix'),(_binary '~\Ôf\nJÁñ¶jF\ï\\ix','ì»¤ë° ë©ìì§ë¥¼ ì¸ë¼ì¸ì¼ë¡ ìì±í©ëë¤.','-m \"ë©ìì§\"',_binary '~\Ð\ê¼JÁñ¶jF\ï\\ix'),(_binary '~\ÔgJÁñ¶jF\ï\\ix','ê°ì¥ ìµê·¼ ì»¤ë°ì ìì í©ëë¤.','--amend',_binary '~\Ð\ê¼JÁñ¶jF\ï\\ix'),(_binary '~\ÔhJÁñ¶jF\ï\\ix','í¹ì  ë¸ëì¹ë¥¼ ìê²© ì ì¥ìì ìë¡ëí©ëë¤.','origin <ë¸ëì¹ëª>',_binary '~\Ð\ëJÁñ¶jF\ï\\ix'),(_binary '~\ÔiJÁñ¶jF\ï\\ix','ìê²© ì ì¥ìë¥¼ ë¡ì»¬ ê¸°ì¤ì¼ë¡ ê°ì  ë®ì´ìëë¤.','--force',_binary '~\Ð\ëJÁñ¶jF\ï\\ix'),(_binary '~\ÔjiJÁñ¶jF\ï\\ix','í¹ì  ìê²© ë¸ëì¹ì ë³ê²½ì¬í­ì ê°ì ¸ì ë³í©í©ëë¤.','origin <ë¸ëì¹ëª>',_binary '~\Ð\ë_JÁñ¶jF\ï\\ix'),(_binary '~\Ôk_JÁñ¶jF\ï\\ix','ë³í© ëì  rebase ë°©ìì¼ë¡ ë³ê²½ì¬í­ì íµí©í©ëë¤.','--rebase',_binary '~\Ð\ë_JÁñ¶jF\ï\\ix'),(_binary '~\ÔlTJÁñ¶jF\ï\\ix','ìê²© ì ì¥ì originì ë³ê²½ì¬í­ì ê°ì ¸ìµëë¤.','origin',_binary '~\Ð\ë©JÁñ¶jF\ï\\ix'),(_binary '~\ÔmSJÁñ¶jF\ï\\ix','Fast-forward ìì´ í­ì merge ì»¤ë°ì ìì±í©ëë¤.','--no-ff',_binary '~\Ð\ëðJÁñ¶jF\ï\\ix'),(_binary '~\ÔnXJÁñ¶jF\ï\\ix','ëì ë¸ëì¹ì ì»¤ë°ì íëë¡ í©ì³ ì¤íì´ì§í©ëë¤.','--squash',_binary '~\Ð\ëðJÁñ¶jF\ï\\ix'),(_binary '~\Ôo·JÁñ¶jF\ï\\ix','ì§ì í ë¸ëì¹ë¡ ì´ëí©ëë¤.','<ë¸ëì¹ëª>',_binary '~\Ð\ìJÁñ¶jF\ï\\ix'),(_binary '~\Ôp\îJÁñ¶jF\ï\\ix','ì ë¸ëì¹ë¥¼ ìì±íê³  ì´ëí©ëë¤.','<ë¸ëì¹ëª>',_binary '~\Ð\íJÁñ¶jF\ï\\ix'),(_binary '~\ÔqüJÁñ¶jF\ï\\ix','ì§ì í ë¸ëì¹ ìë¡ íì¬ ë¸ëì¹ ì»¤ë°ì ì¬ë°°ì¹í©ëë¤.','<ë¸ëì¹ëª>',_binary '~\Ð\í{JÁñ¶jF\ï\\ix'),(_binary '~\Ôs\nJÁñ¶jF\ï\\ix','ìµê·¼ Nê°ì ì»¤ë°ì ëííì¼ë¡ í¸ì§í©ëë¤.','-i HEAD~N',_binary '~\Ð\í{JÁñ¶jF\ï\\ix'),(_binary '~\ÔtJÁñ¶jF\ï\\ix','í¹ì  ë¸ëì¹ë¥¼ ê°ì ë¡ ìê²© ì ì¥ìì ë®ì´ìëë¤.','origin <ë¸ëì¹ëª>',_binary '~\Ð\í\èJÁñ¶jF\ï\\ix'),(_binary '~\Ôu4JÁñ¶jF\ï\\ix','íì¬ ë¸ëì¹ì ì§ì í ë¸ëì¹ì ì°¨ì´ë¥¼ ë¹êµí©ëë¤.','<ë¸ëì¹ëª>',_binary '~\Ð\îBJÁñ¶jF\ï\\ix'),(_binary '~\ÔvIJÁñ¶jF\ï\\ix','ì¤íì´ì§ë ë³ê²½ì¬í­ì ë¹êµí©ëë¤.','--staged',_binary '~\Ð\îBJÁñ¶jF\ï\\ix'),(_binary '~\ÔwnJÁñ¶jF\ï\\ix','ìì ëë í ë¦¬ ìì´ ìê²© ì ì¥ìì© ì ì¥ìë¥¼ ì´ê¸°íí©ëë¤.','--bare',_binary '~\Ð\îJÁñ¶jF\ï\\ix'),(_binary '~\ÔxJÁñ¶jF\ï\\ix','ë³ê²½ ìíë¥¼ ê°ëµíê² íìí©ëë¤.','-s',_binary '~\Ð\î\ÊJÁñ¶jF\ï\\ix'),(_binary '~\Ôy\ÄJÁñ¶jF\ï\\ix','ì»¤ë° íì¤í ë¦¬ë¥¼ í ì¤ë¡ ê°ëµíê² íìí©ëë¤.','--oneline',_binary '~\Ð\ïJÁñ¶jF\ï\\ix'),(_binary '~\Ôz\îJÁñ¶jF\ï\\ix','ë¸ëì¹ ë¶ê¸° êµ¬ì¡°ë¥¼ ê·¸ëíë¡ íìí©ëë¤.','--graph',_binary '~\Ð\ïJÁñ¶jF\ï\\ix'),(_binary '~\Ô|JÁñ¶jF\ï\\ix','ê°ì¥ ìµê·¼ì ì ì¥í stashë¥¼ êº¼ë´ ì ì©í©ëë¤.','pop',_binary '~\Ð\ïYJÁñ¶jF\ï\\ix'),(_binary '~\Ô}KJÁñ¶jF\ï\\ix','ì ì¥ë stash ëª©ë¡ì ì¡°íí©ëë¤.','list',_binary '~\Ð\ïYJÁñ¶jF\ï\\ix'),(_binary '~\Ô~zJÁñ¶jF\ï\\ix','ìµê·¼ ì»¤ë°ì ì·¨ìíë ë³ê²½ì¬í­ì ì¤íì´ì§ ìíë¡ ì ì§í©ëë¤.','--soft HEAD~1',_binary '~\Ð\ï¥JÁñ¶jF\ï\\ix'),(_binary '~\Ô¸JÁñ¶jF\ï\\ix','ìµê·¼ ì»¤ë°ê³¼ ë³ê²½ì¬í­ì ëª¨ë ì­ì í©ëë¤.','--hard HEAD~1',_binary '~\Ð\ï¥JÁñ¶jF\ï\\ix'),(_binary '~ÔñJÁñ¶jF\ï\\ix','í¹ì  íì¼ì ë³ê²½ì¬í­ì ëëë¦½ëë¤.','<íì¼ëª>',_binary '~\Ð\ï\êJÁñ¶jF\ï\\ix'),(_binary '~Ô.JÁñ¶jF\ï\\ix','ì¤íì´ì§ë íì¼ì ì¸ì¤íì´ì§í©ëë¤.','--staged <íì¼ëª>',_binary '~\Ð\ï\êJÁñ¶jF\ï\\ix'),(_binary '~ÔxJÁñ¶jF\ï\\ix','ë³í©ì´ ìë£ë ë¸ëì¹ë¥¼ ì­ì í©ëë¤.','-d <ë¸ëì¹ëª>',_binary '~\Ðð)JÁñ¶jF\ï\\ix'),(_binary '~ÔhJÁñ¶jF\ï\\ix','ë¡ì»¬ê³¼ ìê²© ë¸ëì¹ ëª©ë¡ì ëª¨ë ì¡°íí©ëë¤.','-a',_binary '~\Ðð)JÁñ¶jF\ï\\ix'),(_binary '~Ô\ÈJÁñ¶jF\ï\\ix','ì§ì í ì»¤ë°ì íì¬ ë¸ëì¹ì ì ì©í©ëë¤.','<ì»¤ë° í´ì>',_binary '~\ÐðiJÁñ¶jF\ï\\ix'),(_binary ',ü\ÍT<ñ)l*¨','--forceë³´ë¤ ìì í ê°ì  push. ìê²©ì ë´ê° ëª¨ë¥´ë ì»¤ë°ì´ ìì¼ë©´ pushë¥¼ ê±°ë¶í´ ëë£ ììì ì§í¤ì§ ììµëë¤.','--force-with-lease',_binary '~\Ð\ëJÁñ¶jF\ï\\ix'),(_binary '.\ÜoT<ñ)l*¨','ì²« push ì ë¡ì»¬-ìê²© ë¸ëì¹ë¥¼ ì°ê²°(upstream ì¤ì )í©ëë¤. ë¤ìë¶í´ git pushë§ ìë ¥í´ë ê°ì ë¸ëì¹ë¡ ë³´ë¼ ì ììµëë¤.','-u origin <ë¸ëì¹ëª>',_binary '~\Ð\ëJÁñ¶jF\ï\\ix'),(_binary '0\Ï\nT<ñ)l*¨','ê°ì¥ ìµê·¼ ì»¤ë°ì ìì íë ì»¤ë° ë©ìì§ë ê·¸ëë¡ ë¡ëë¤. íì¼ë§ ì¶ê°/ìì íê³  ë©ìì§ë¥¼ ì ë°ê¿ ë í¸í©ëë¤.','--amend --no-edit',_binary '~\Ð\ê¼JÁñ¶jF\ï\\ix'),(_binary '2\é\âT<ñ)l*¨','ì»¤ë°ê³¼ ì¤íì´ì§ë¥¼ ëª¨ë ì·¨ìíë ìí¹ëë í ë¦¬ ë³ê²½ì¬í­ì ì ì§í©ëë¤. resetì ê¸°ë³¸ê°ì´ì§ë§ ëªìì ì¼ë¡ ííí  ë ìëë¤.','--mixed HEAD~1',_binary '~\Ð\ï¥JÁñ¶jF\ï\\ix'),(_binary '5\ïµT<ñ)l*¨','ê°ì¥ ìµê·¼ stashë¥¼ ì ì©íë ëª©ë¡ìë ê·¸ëë¡ ë¨ê¹ëë¤. popì ì ì© í ëª©ë¡ìì ì ê±°íì§ë§ applyë ë³´ì¡´í©ëë¤.','apply',_binary '~\Ð\ïYJÁñ¶jF\ï\\ix'),(_binary '8\èT<ñ)l*¨','íì¬ ë¸ëì¹ë§ì´ ìëë¼ ëª¨ë  ë¸ëì¹ì ì»¤ë°ì í¨ê» ë³´ì¬ì¤ëë¤. --oneline --graphì ìì£¼ ì¡°í©í©ëë¤.','--all',_binary '~\Ð\ïJÁñ¶jF\ï\\ix'),(_binary '9\æDT<ñ)l*¨','ë±ë¡ë ìê²© ì ì¥ìì URLì í¨ê» ë³´ì¬ì¤ëë¤. fetchì push URLì´ ë°ë¡ íìë©ëë¤.','-v',_binary '\"T<ñ)l*¨'),(_binary ';\Ò$T<ñ)l*¨','ì£¼ì íê·¸(annotated tag)ë¥¼ ìì±í©ëë¤. ì¼ë° íê·¸ì ë¬ë¦¬ ìì±ì, ìê°, ë©ìì§ê° í¨ê» ê¸°ë¡ëì´ ë¦´ë¦¬ì¦ ê´ë¦¬ì ì í©í©ëë¤.','-a <íê·¸ëª> -m \"ë©ìì§\"',_binary '&x\ÇT<ñ)l*¨'),(_binary '=\ìT<ñ)l*¨','ì§ì í ë¸ëì¹ë¡ ì´ëí©ëë¤. Git 2.23 ì´ìì´ë¼ë©´ git switch <ë¸ëì¹ëª>ì ê¶ì¥í©ëë¤.','<ë¸ëì¹ëª>',_binary '$~T<ñ)l*¨'),(_binary '@\çT<ñ)l*¨','ë¡ì»¬ì ìì±ë íê·¸ë¥¼ ì­ì í©ëë¤.','-d <íê·¸ëª>',_binary '&x\ÇT<ñ)l*¨'),(_binary 'CG\ÔT<ñ)l*¨','ìì±í íê·¸ë¥¼ ìê²© ì ì¥ìì ìë¡ëí©ëë¤.','push origin <íê·¸ëª>',_binary '&x\ÇT<ñ)l*¨'),(_binary 'E -T<ñ)l*¨','reflog ê¸°ë¡ì ìê°ì ISO íìì¼ë¡ ìì¸í íìí©ëë¤.','--date=iso',_binary '(¤T<ñ)l*¨'),(_binary 'G\ÛT<ñ)l*¨','í¹ì  ë¸ëì¹ì HEAD ì´ë ê¸°ë¡ì ì¡°íí©ëë¤.','show <ë¸ëì¹ëª>',_binary '(¤T<ñ)l*¨'),(_binary 'IÑ¤T<ñ)l*¨','ì¸ë¶ ì ì¥ìë¥¼ ì§ì í ê²½ë¡ì ìë¸ëª¨ëë¡ ì¶ê°í©ëë¤.','add <ì ì¥ìURL> <ê²½ë¡>',_binary '*¨\ÍT<ñ)l*¨'),(_binary 'K\é*T<ñ)l*¨','ì ì¥ìì ë±ë¡ë ìë¸ëª¨ë ì¤ì ì ì´ê¸°íí©ëë¤.','init',_binary '*¨\ÍT<ñ)l*¨'),(_binary 'N0¹T<ñ)l*¨','ìë¸ëª¨ëì´ ê°ë¦¬í¤ë ì»¤ë° ê¸°ì¤ì¼ë¡ ë´ì©ì ë´ë ¤ë°ê³  ë§ì¶¥ëë¤.','update',_binary '*¨\ÍT<ñ)l*¨'),(_binary 'OüT<ñ)l*¨','ìë¸ëª¨ëì ì´ê¸°ííê³  ì¤ì²©ë ìë¸ëª¨ëê¹ì§ í¨ê» ë´ë ¤ë°ìµëë¤.','update --init --recursive',_binary '*¨\ÍT<ñ)l*¨');
/*!40000 ALTER TABLE `dictionary_command_option` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member`
--

DROP TABLE IF EXISTS `member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member` (
  `member_id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `auth_type` enum('LOCAL','OAUTH') NOT NULL,
  `character_body` varchar(50) NOT NULL,
  `character_eye` varchar(50) NOT NULL,
  `character_hair` varchar(50) NOT NULL,
  `character_hair_color` varchar(50) NOT NULL,
  `character_outfit` varchar(50) NOT NULL,
  `character_outfit_color` varchar(50) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `onboarding_status` enum('NICKNAME_SET_DONE','NONE','TUTORIAL_DONE') NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `provider` enum('GOOGLE') DEFAULT NULL,
  `provider_id` varchar(255) DEFAULT NULL,
  `total_play_time` int NOT NULL,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `uq_member_email` (`email`),
  UNIQUE KEY `uq_member_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member`
--

LOCK TABLES `member` WRITE;
/*!40000 ALTER TABLE `member` DISABLE KEYS */;
/*!40000 ALTER TABLE `member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_best_record`
--

DROP TABLE IF EXISTS `member_best_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_best_record` (
  `member_best_record_id` binary(16) NOT NULL,
  `best_rank` int NOT NULL,
  `best_score` int NOT NULL,
  `member_id` binary(16) NOT NULL,
  `mode` enum('SINGLE_EASY','SINGLE_NORMAL','SINGLE_HARD','TIME_ATTACK','CONTRIBUTION','COOP') NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`member_best_record_id`),
  UNIQUE KEY `uq_member_best_record` (`member_id`,`mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_best_record`
--

LOCK TABLES `member_best_record` WRITE;
/*!40000 ALTER TABLE `member_best_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `member_best_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_coop_best_record`
--

DROP TABLE IF EXISTS `member_coop_best_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_coop_best_record` (
  `member_coop_best_record_id` binary(16) NOT NULL,
  `best_rank` int NOT NULL,
  `best_time` int NOT NULL,
  `difficulty` int NOT NULL,
  `map_name` varchar(100) NOT NULL,
  `member_id` binary(16) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`member_coop_best_record_id`),
  UNIQUE KEY `uq_member_coop_best_record` (`member_id`,`map_name`,`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_coop_best_record`
--

LOCK TABLES `member_coop_best_record` WRITE;
/*!40000 ALTER TABLE `member_coop_best_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `member_coop_best_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `single_command_set`
--

DROP TABLE IF EXISTS `single_command_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `single_command_set` (
  `single_command_set_id` binary(16) NOT NULL,
  `difficulty` enum('EASY','HARD','NORMAL') NOT NULL,
  `set_number` int NOT NULL,
  PRIMARY KEY (`single_command_set_id`),
  UNIQUE KEY `uq_single_command_set` (`set_number`,`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `single_command_set`
--

LOCK TABLES `single_command_set` WRITE;
/*!40000 ALTER TABLE `single_command_set` DISABLE KEYS */;
INSERT INTO `single_command_set` VALUES (_binary '\Ë\í;T<ñ)l*¨','EASY',1),(_binary '½T<ñ)l*¨','HARD',1),(_binary '\åv4T<ñ)l*¨','NORMAL',1),(_binary '\Ó\Z@T<ñ)l*¨','EASY',2),(_binary 'U\êT<ñ)l*¨','HARD',2),(_binary '\ìøT<ñ)l*¨','NORMAL',2),(_binary '\ÙT<ñ)l*¨','EASY',3),(_binary '\røT<ñ)l*¨','HARD',3),(_binary 'ó \ãT<ñ)l*¨','NORMAL',3),(_binary '\ÞÀ§T<ñ)l*¨','EASY',4),(_binary 'aT<ñ)l*¨','HARD',4),(_binary 'ú/\ÝT<ñ)l*¨','NORMAL',4);
/*!40000 ALTER TABLE `single_command_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `single_command_set_item`
--

DROP TABLE IF EXISTS `single_command_set_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `single_command_set_item` (
  `single_command_set_item_id` binary(16) NOT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `command_text` varchar(255) NOT NULL,
  `command_type` enum('CREATE','MERGE','SWITCH','COMMON','CONFLICT') NOT NULL,
  `sequence` int NOT NULL,
  `single_command_set_id` binary(16) NOT NULL,
  PRIMARY KEY (`single_command_set_item_id`),
  UNIQUE KEY `uq_single_command_set_item` (`single_command_set_id`,`sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `single_command_set_item`
--

LOCK TABLES `single_command_set_item` WRITE;
/*!40000 ALTER TABLE `single_command_set_item` DISABLE KEYS */;
INSERT INTO `single_command_set_item` VALUES (_binary '\ÏÅµT<ñ)l*¨','main','git add .','COMMON',1,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\Ç\ÚT<ñ)l*¨','main','git commit -m \'init\'','COMMON',2,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÏÈ»T<ñ)l*¨','main','git push origin main','COMMON',3,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\ÉGT<ñ)l*¨','main','git switch -c feat/cart','CREATE',4,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\ÉÀT<ñ)l*¨','feat/cart','git add src/Cart.js','COMMON',5,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\Ê?T<ñ)l*¨','feat/cart','git commit -m \'feat\'','COMMON',6,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÏÊ¶T<ñ)l*¨','feat/cart','git add src/CartItem.js','COMMON',7,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\Ë5T<ñ)l*¨','feat/cart','git commit -m \'feat\'','COMMON',8,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÏË¯T<ñ)l*¨','feat/cart','git push origin feat/cart','COMMON',9,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\Ì!T<ñ)l*¨','feat/cart','git switch main','SWITCH',10,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÏÌT<ñ)l*¨','main','git pull origin main','COMMON',11,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\Ï\ÍT<ñ)l*¨','main','git merge feat/cart','MERGE',12,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÏÍT<ñ)l*¨','main','git push origin main','COMMON',13,_binary '\Ë\í;T<ñ)l*¨'),(_binary '\ÖöpT<ñ)l*¨','main','git add .','COMMON',1,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\Öø^T<ñ)l*¨','main','git commit -m \'init\'','COMMON',2,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\Öø\ÚT<ñ)l*¨','main','git push origin main','COMMON',3,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖùAT<ñ)l*¨','main','git switch -c feat/editor','CREATE',4,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\Öù\ÇT<ñ)l*¨','feat/editor','git add src/Editor.js','COMMON',5,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖúMT<ñ)l*¨','feat/editor','git commit -m \'feat\'','COMMON',6,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\Öú¶T<ñ)l*¨','feat/editor','git add src/EditorToolbar.js','COMMON',7,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖûT<ñ)l*¨','feat/editor','git commit -m \'feat\'','COMMON',8,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖûUT<ñ)l*¨','feat/editor','git push origin feat/editor','COMMON',9,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖüDT<ñ)l*¨','feat/editor','git switch main','SWITCH',10,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖüT<ñ)l*¨','main','git pull origin main','COMMON',11,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖýT<ñ)l*¨','main','git merge feat/editor','MERGE',12,_binary '\Ó\Z@T<ñ)l*¨'),(_binary '\ÖýT<ñ)l*¨','main','git push origin main','COMMON',13,_binary '\Ó\Z@T<ñ)l*¨'),(_binary 'ÜjT<ñ)l*¨','main','git add .','COMMON',1,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü4T<ñ)l*¨','main','git commit -m \'init\'','COMMON',2,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü²T<ñ)l*¨','main','git push origin main','COMMON',3,_binary '\ÙT<ñ)l*¨'),(_binary 'ÜT<ñ)l*¨','main','git switch -c feat/feed','CREATE',4,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü^T<ñ)l*¨','feat/feed','git add src/Feed.js','COMMON',5,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü­T<ñ)l*¨','feat/feed','git commit -m \'feat\'','COMMON',6,_binary '\ÙT<ñ)l*¨'),(_binary 'ÜüT<ñ)l*¨','feat/feed','git add src/FeedItem.js','COMMON',7,_binary '\ÙT<ñ)l*¨'),(_binary 'ÜHT<ñ)l*¨','feat/feed','git commit -m \'feat\'','COMMON',8,_binary '\ÙT<ñ)l*¨'),(_binary 'ÜT<ñ)l*¨','feat/feed','git push origin feat/feed','COMMON',9,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü\åT<ñ)l*¨','feat/feed','git switch main','SWITCH',10,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü9T<ñ)l*¨','main','git pull origin main','COMMON',11,_binary '\ÙT<ñ)l*¨'),(_binary 'ÜT<ñ)l*¨','main','git merge feat/feed','MERGE',12,_binary '\ÙT<ñ)l*¨'),(_binary 'Ü\ÔT<ñ)l*¨','main','git push origin main','COMMON',13,_binary '\ÙT<ñ)l*¨'),(_binary '\â\×]T<ñ)l*¨','main','git add .','COMMON',1,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\âÙT<ñ)l*¨','main','git commit -m \'init\'','COMMON',2,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\âÚ¢T<ñ)l*¨','main','git push origin main','COMMON',3,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\Û)T<ñ)l*¨','main','git switch -c feat/menu','CREATE',4,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\Û|T<ñ)l*¨','feat/menu','git add src/Menu.js','COMMON',5,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\Û\ÓT<ñ)l*¨','feat/menu','git commit -m \'feat\'','COMMON',6,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\Ü&T<ñ)l*¨','feat/menu','git add src/MenuItem.js','COMMON',7,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\ÜsT<ñ)l*¨','feat/menu','git commit -m \'feat\'','COMMON',8,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\âÜ¾T<ñ)l*¨','feat/menu','git push origin feat/menu','COMMON',9,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\ÝT<ñ)l*¨','feat/menu','git switch main','SWITCH',10,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\Ý[T<ñ)l*¨','main','git pull origin main','COMMON',11,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\âÝ¦T<ñ)l*¨','main','git merge feat/menu','MERGE',12,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\â\ÝöT<ñ)l*¨','main','git push origin main','COMMON',13,_binary '\ÞÀ§T<ñ)l*¨'),(_binary '\éyaT<ñ)l*¨','main','git fetch origin','COMMON',1,_binary '\åv4T<ñ)l*¨'),(_binary '\é{7T<ñ)l*¨','main','git pull origin main','COMMON',2,_binary '\åv4T<ñ)l*¨'),(_binary '\é{­T<ñ)l*¨','main','git switch -c feat/product-detail','CREATE',3,_binary '\åv4T<ñ)l*¨'),(_binary '\é|T<ñ)l*¨','feat/product-detail','git add src/ProductDetail.js','COMMON',4,_binary '\åv4T<ñ)l*¨'),(_binary '\é|cT<ñ)l*¨','feat/product-detail','git commit -m \'feat: add product detail page\'','COMMON',5,_binary '\åv4T<ñ)l*¨'),(_binary '\é|¸T<ñ)l*¨','feat/product-detail','git add src/ProductImage.js','COMMON',6,_binary '\åv4T<ñ)l*¨'),(_binary '\é}T<ñ)l*¨','feat/product-detail','git commit -m \'feat: add product image component\'','COMMON',7,_binary '\åv4T<ñ)l*¨'),(_binary '\é}TT<ñ)l*¨','feat/product-detail','git push origin feat/product-detail','COMMON',8,_binary '\åv4T<ñ)l*¨'),(_binary '\é}¡T<ñ)l*¨','main','git merge feat/product-detail','MERGE',9,_binary '\åv4T<ñ)l*¨'),(_binary '\é}\íT<ñ)l*¨','main','git push origin main','COMMON',10,_binary '\åv4T<ñ)l*¨'),(_binary '\é~;T<ñ)l*¨','main','git switch -c feat/cart','CREATE',11,_binary '\åv4T<ñ)l*¨'),(_binary '\é~T<ñ)l*¨','feat/cart','git add src/Cart.js','COMMON',12,_binary '\åv4T<ñ)l*¨'),(_binary '\é~\ÒT<ñ)l*¨','feat/cart','git commit -m \'feat: add shopping cart\'','COMMON',13,_binary '\åv4T<ñ)l*¨'),(_binary '\é&T<ñ)l*¨','feat/cart','git rebase main','COMMON',14,_binary '\åv4T<ñ)l*¨'),(_binary '\évT<ñ)l*¨','feat/cart','git push origin feat/cart','COMMON',15,_binary '\åv4T<ñ)l*¨'),(_binary '\é\ÃT<ñ)l*¨','main','git merge feat/cart','MERGE',16,_binary '\åv4T<ñ)l*¨'),(_binary '\éT<ñ)l*¨','main','git push origin main','COMMON',17,_binary '\åv4T<ñ)l*¨'),(_binary '\ïz\ÝT<ñ)l*¨','main','git fetch origin','COMMON',1,_binary '\ìøT<ñ)l*¨'),(_binary '\ï|T<ñ)l*¨','main','git pull origin main','COMMON',2,_binary '\ìøT<ñ)l*¨'),(_binary '\ï}T<ñ)l*¨','main','git switch -c feat/editor','CREATE',3,_binary '\ìøT<ñ)l*¨'),(_binary '\ï}gT<ñ)l*¨','feat/editor','git add src/Editor.js','COMMON',4,_binary '\ìøT<ñ)l*¨'),(_binary '\ï}µT<ñ)l*¨','feat/editor','git commit -m \'feat: add post editor\'','COMMON',5,_binary '\ìøT<ñ)l*¨'),(_binary '\ï~T<ñ)l*¨','feat/editor','git add src/EditorToolbar.js','COMMON',6,_binary '\ìøT<ñ)l*¨'),(_binary '\ï~VT<ñ)l*¨','feat/editor','git commit -m \'feat: add editor toolbar\'','COMMON',7,_binary '\ìøT<ñ)l*¨'),(_binary '\ï~§T<ñ)l*¨','feat/editor','git push origin feat/editor','COMMON',8,_binary '\ìøT<ñ)l*¨'),(_binary '\ï~ôT<ñ)l*¨','main','git merge feat/editor','MERGE',9,_binary '\ìøT<ñ)l*¨'),(_binary '\ïET<ñ)l*¨','main','git push origin main','COMMON',10,_binary '\ìøT<ñ)l*¨'),(_binary '\ïT<ñ)l*¨','main','git switch -c feat/comment','CREATE',11,_binary '\ìøT<ñ)l*¨'),(_binary '\ï\áT<ñ)l*¨','feat/comment','git add src/Comment.js','COMMON',12,_binary '\ìøT<ñ)l*¨'),(_binary '\ï-T<ñ)l*¨','feat/comment','git commit -m \'feat: add comment component\'','COMMON',13,_binary '\ìøT<ñ)l*¨'),(_binary '\ï|T<ñ)l*¨','feat/comment','git rebase main','COMMON',14,_binary '\ìøT<ñ)l*¨'),(_binary '\ï\ËT<ñ)l*¨','feat/comment','git push origin feat/comment','COMMON',15,_binary '\ìøT<ñ)l*¨'),(_binary '\ïT<ñ)l*¨','main','git merge feat/comment','MERGE',16,_binary '\ìøT<ñ)l*¨'),(_binary '\ïcT<ñ)l*¨','main','git push origin main','COMMON',17,_binary '\ìøT<ñ)l*¨'),(_binary '÷\ëdT<ñ)l*¨','main','git fetch origin','COMMON',1,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\íT<ñ)l*¨','main','git pull origin main','COMMON',2,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\íT<ñ)l*¨','main','git switch -c feat/feed','CREATE',3,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\íõT<ñ)l*¨','feat/feed','git add src/Feed.js','COMMON',4,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\îGT<ñ)l*¨','feat/feed','git commit -m \'feat: add feed page\'','COMMON',5,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\îT<ñ)l*¨','feat/feed','git add src/FeedItem.js','COMMON',6,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\î\êT<ñ)l*¨','feat/feed','git commit -m \'feat: add feed item component\'','COMMON',7,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\ï:T<ñ)l*¨','feat/feed','git push origin feat/feed','COMMON',8,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\ïT<ñ)l*¨','main','git merge feat/feed','MERGE',9,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷\ï\ÛT<ñ)l*¨','main','git push origin main','COMMON',10,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷ð(T<ñ)l*¨','main','git switch -c feat/notification','CREATE',11,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷ðwT<ñ)l*¨','feat/notification','git add src/Notification.js','COMMON',12,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷ð\ÄT<ñ)l*¨','feat/notification','git commit -m \'feat: add notification component\'','COMMON',13,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷ñ\ÖT<ñ)l*¨','feat/notification','git rebase main','COMMON',14,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷ò*T<ñ)l*¨','feat/notification','git push origin feat/notification','COMMON',15,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷òwT<ñ)l*¨','main','git merge feat/notification','MERGE',16,_binary 'ó \ãT<ñ)l*¨'),(_binary '÷òÀT<ñ)l*¨','main','git push origin main','COMMON',17,_binary 'ó \ãT<ñ)l*¨'),(_binary 'þ:_T<ñ)l*¨','main','git fetch origin','COMMON',1,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ<T<ñ)l*¨','main','git pull origin main','COMMON',2,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ<yT<ñ)l*¨','main','git switch -c feat/menu','CREATE',3,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ<\ÐT<ñ)l*¨','feat/menu','git add src/Menu.js','COMMON',4,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ= T<ñ)l*¨','feat/menu','git commit -m \'feat: add menu page\'','COMMON',5,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ=uT<ñ)l*¨','feat/menu','git add src/MenuItem.js','COMMON',6,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ=\ÅT<ñ)l*¨','feat/menu','git commit -m \'feat: add menu item component\'','COMMON',7,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ>T<ñ)l*¨','feat/menu','git push origin feat/menu','COMMON',8,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ>_T<ñ)l*¨','main','git merge feat/menu','MERGE',9,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ>®T<ñ)l*¨','main','git push origin main','COMMON',10,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ>üT<ñ)l*¨','main','git switch -c feat/order','CREATE',11,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ?FT<ñ)l*¨','feat/order','git add src/Order.js','COMMON',12,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ?T<ñ)l*¨','feat/order','git commit -m \'feat: add order page\'','COMMON',13,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ?÷T<ñ)l*¨','feat/order','git rebase main','COMMON',14,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ@vT<ñ)l*¨','feat/order','git push origin feat/order','COMMON',15,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þ@\ëT<ñ)l*¨','main','git merge feat/order','MERGE',16,_binary 'ú/\ÝT<ñ)l*¨'),(_binary 'þA`T<ñ)l*¨','main','git push origin main','COMMON',17,_binary 'ú/\ÝT<ñ)l*¨'),(_binary '\Ù8T<ñ)l*¨','main','git pull origin main','COMMON',1,_binary '½T<ñ)l*¨'),(_binary '\Ú\ÒT<ñ)l*¨','main','git switch -c feat/login','CREATE',2,_binary '½T<ñ)l*¨'),(_binary '\ÛBT<ñ)l*¨','feat/login','git add src/Login.js','COMMON',3,_binary '½T<ñ)l*¨'),(_binary 'ÛT<ñ)l*¨','feat/login','git commit -m \'feat: add login\'','COMMON',4,_binary '½T<ñ)l*¨'),(_binary '\Û\îT<ñ)l*¨','main','git switch -c feat/cart','CREATE',5,_binary '½T<ñ)l*¨'),(_binary '\Ü<T<ñ)l*¨','feat/cart','git add src/Cart.js','COMMON',6,_binary '½T<ñ)l*¨'),(_binary 'ÜT<ñ)l*¨','feat/cart','git commit -m \'feat: add cart\'','COMMON',7,_binary '½T<ñ)l*¨'),(_binary '\Ü\ÓT<ñ)l*¨','feat/cart','git add src/App.js','COMMON',8,_binary '½T<ñ)l*¨'),(_binary '\Ý T<ñ)l*¨','feat/cart','git commit -m \'chore: register cart\'','COMMON',9,_binary '½T<ñ)l*¨'),(_binary '\ÞT<ñ)l*¨','feat/login','git add src/App.js','COMMON',10,_binary '½T<ñ)l*¨'),(_binary '\ÞtT<ñ)l*¨','feat/login','git commit -m \'chore: register login\'','COMMON',11,_binary '½T<ñ)l*¨'),(_binary 'Þ¿T<ñ)l*¨','feat/login','git push origin feat/login','COMMON',12,_binary '½T<ñ)l*¨'),(_binary '\ßT<ñ)l*¨','feat/cart','git add src/Navbar.js','COMMON',13,_binary '½T<ñ)l*¨'),(_binary '\ßYT<ñ)l*¨','feat/cart','git commit -m \'style: update navbar\'','COMMON',14,_binary '½T<ñ)l*¨'),(_binary 'ß©T<ñ)l*¨','feat/cart','git push origin feat/cart','COMMON',15,_binary '½T<ñ)l*¨'),(_binary '\ßöT<ñ)l*¨','main','git merge feat/login','MERGE',16,_binary '½T<ñ)l*¨'),(_binary '\àBT<ñ)l*¨','main','git merge feat/cart','CONFLICT',17,_binary '½T<ñ)l*¨'),(_binary '\àT<ñ)l*¨','main','git add src/App.js','COMMON',18,_binary '½T<ñ)l*¨'),(_binary '\à\ÝT<ñ)l*¨','main','git commit -m \'fix: resolve conflict\'','COMMON',19,_binary '½T<ñ)l*¨'),(_binary ' \àT<ñ)l*¨','main','git pull origin main','COMMON',1,_binary 'U\êT<ñ)l*¨'),(_binary '\"lT<ñ)l*¨','main','git switch -c feat/post','CREATE',2,_binary 'U\êT<ñ)l*¨'),(_binary '\"\ÙT<ñ)l*¨','feat/post','git add src/Post.js','COMMON',3,_binary 'U\êT<ñ)l*¨'),(_binary '#/T<ñ)l*¨','feat/post','git commit -m \'feat: add post\'','COMMON',4,_binary 'U\êT<ñ)l*¨'),(_binary '#T<ñ)l*¨','feat/post','git add src/Router.js','COMMON',5,_binary 'U\êT<ñ)l*¨'),(_binary '#\ÏT<ñ)l*¨','feat/post','git commit -m \'chore: register post\'','COMMON',6,_binary 'U\êT<ñ)l*¨'),(_binary '$T<ñ)l*¨','main','git switch -c feat/comment','CREATE',7,_binary 'U\êT<ñ)l*¨'),(_binary '$gT<ñ)l*¨','feat/comment','git add src/Comment.js','COMMON',8,_binary 'U\êT<ñ)l*¨'),(_binary '$³T<ñ)l*¨','feat/comment','git commit -m \'feat: add comment\'','COMMON',9,_binary 'U\êT<ñ)l*¨'),(_binary '%\0T<ñ)l*¨','feat/post','git add src/Sidebar.js','COMMON',10,_binary 'U\êT<ñ)l*¨'),(_binary '%JT<ñ)l*¨','feat/post','git commit -m \'style: update sidebar\'','COMMON',11,_binary 'U\êT<ñ)l*¨'),(_binary '%T<ñ)l*¨','feat/post','git push origin feat/post','COMMON',12,_binary 'U\êT<ñ)l*¨'),(_binary '%\ÞT<ñ)l*¨','feat/comment','git add src/Router.js','COMMON',13,_binary 'U\êT<ñ)l*¨'),(_binary '&+T<ñ)l*¨','feat/comment','git commit -m \'chore: register comment\'','COMMON',14,_binary 'U\êT<ñ)l*¨'),(_binary '&T<ñ)l*¨','feat/comment','git push origin feat/comment','COMMON',15,_binary 'U\êT<ñ)l*¨'),(_binary '&\ÉT<ñ)l*¨','main','git merge feat/post','MERGE',16,_binary 'U\êT<ñ)l*¨'),(_binary '\'T<ñ)l*¨','main','git merge feat/comment','CONFLICT',17,_binary 'U\êT<ñ)l*¨'),(_binary '\'fT<ñ)l*¨','main','git add src/Router.js','COMMON',18,_binary 'U\êT<ñ)l*¨'),(_binary '\'¯T<ñ)l*¨','main','git commit -m \'fix: resolve conflict\'','COMMON',19,_binary 'U\êT<ñ)l*¨'),(_binary 'u\ÓT<ñ)l*¨','main','git pull origin main','COMMON',1,_binary '\røT<ñ)l*¨'),(_binary 'woT<ñ)l*¨','main','git switch -c feat/feed','CREATE',2,_binary '\røT<ñ)l*¨'),(_binary 'w\ãT<ñ)l*¨','feat/feed','git add src/Feed.js','COMMON',3,_binary '\røT<ñ)l*¨'),(_binary 'x:T<ñ)l*¨','feat/feed','git commit -m \'feat: add feed\'','COMMON',4,_binary '\røT<ñ)l*¨'),(_binary 'xT<ñ)l*¨','feat/feed','git add src/index.js','COMMON',5,_binary '\røT<ñ)l*¨'),(_binary 'x\ÚT<ñ)l*¨','feat/feed','git commit -m \'chore: register feed\'','COMMON',6,_binary '\røT<ñ)l*¨'),(_binary 'y(T<ñ)l*¨','feat/feed','git push origin feat/feed','COMMON',7,_binary '\røT<ñ)l*¨'),(_binary 'ysT<ñ)l*¨','main','git switch -c feat/story','CREATE',8,_binary '\røT<ñ)l*¨'),(_binary 'y¾T<ñ)l*¨','feat/story','git add src/Story.js','COMMON',9,_binary '\røT<ñ)l*¨'),(_binary 'z\nT<ñ)l*¨','feat/story','git commit -m \'feat: add story\'','COMMON',10,_binary '\røT<ñ)l*¨'),(_binary 'zVT<ñ)l*¨','feat/feed','git add src/Navbar.js','COMMON',11,_binary '\røT<ñ)l*¨'),(_binary 'z¡T<ñ)l*¨','feat/feed','git commit -m \'style: update navbar\'','COMMON',12,_binary '\røT<ñ)l*¨'),(_binary 'òPT<ñ)l*¨','feat/story','git add src/index.js','COMMON',13,_binary '\røT<ñ)l*¨'),(_binary 'ò\åT<ñ)l*¨','feat/story','git commit -m \'chore: register story\'','COMMON',14,_binary '\røT<ñ)l*¨'),(_binary 'óFT<ñ)l*¨','feat/story','git push origin feat/story','COMMON',15,_binary '\røT<ñ)l*¨'),(_binary 'ó T<ñ)l*¨','main','git merge feat/feed','MERGE',16,_binary '\røT<ñ)l*¨'),(_binary 'óöT<ñ)l*¨','main','git merge feat/story','CONFLICT',17,_binary '\røT<ñ)l*¨'),(_binary 'ôIT<ñ)l*¨','main','git add src/index.js','COMMON',18,_binary '\røT<ñ)l*¨'),(_binary 'ôT<ñ)l*¨','main','git commit -m \'fix: resolve conflict\'','COMMON',19,_binary '\røT<ñ)l*¨'),(_binary 'T<ñ)l*¨','main','git pull origin main','COMMON',1,_binary 'aT<ñ)l*¨'),(_binary '~T<ñ)l*¨','main','git switch -c feat/restaurant','CREATE',2,_binary 'aT<ñ)l*¨'),(_binary '&T<ñ)l*¨','feat/restaurant','git add src/Restaurant.js','COMMON',3,_binary 'aT<ñ)l*¨'),(_binary 'T<ñ)l*¨','feat/restaurant','git commit -m \'feat: add restaurant\'','COMMON',4,_binary 'aT<ñ)l*¨'),(_binary '\ÞT<ñ)l*¨','feat/restaurant','git add src/App.js','COMMON',5,_binary 'aT<ñ)l*¨'),(_binary '/T<ñ)l*¨','feat/restaurant','git commit -m \'chore: register restaurant\'','COMMON',6,_binary 'aT<ñ)l*¨'),(_binary 'T<ñ)l*¨','main','git switch -c feat/order','CREATE',7,_binary 'aT<ñ)l*¨'),(_binary '\ÑT<ñ)l*¨','feat/order','git add src/Order.js','COMMON',8,_binary 'aT<ñ)l*¨'),(_binary 'T<ñ)l*¨','feat/order','git commit -m \'feat: add order\'','COMMON',9,_binary 'aT<ñ)l*¨'),(_binary 'nT<ñ)l*¨','feat/restaurant','git add src/Navbar.js','COMMON',10,_binary 'aT<ñ)l*¨'),(_binary 'ºT<ñ)l*¨','feat/restaurant','git commit -m \'style: update navbar\'','COMMON',11,_binary 'aT<ñ)l*¨'),(_binary 'T<ñ)l*¨','feat/restaurant','git push origin feat/restaurant','COMMON',12,_binary 'aT<ñ)l*¨'),(_binary 'WT<ñ)l*¨','feat/order','git add src/App.js','COMMON',13,_binary 'aT<ñ)l*¨'),(_binary '§T<ñ)l*¨','feat/order','git commit -m \'chore: register order\'','COMMON',14,_binary 'aT<ñ)l*¨'),(_binary 'öT<ñ)l*¨','feat/order','git push origin feat/order','COMMON',15,_binary 'aT<ñ)l*¨'),(_binary 'ET<ñ)l*¨','main','git merge feat/restaurant','MERGE',16,_binary 'aT<ñ)l*¨'),(_binary 'T<ñ)l*¨','main','git merge feat/order','CONFLICT',17,_binary 'aT<ñ)l*¨'),(_binary '\ÝT<ñ)l*¨','main','git add src/App.js','COMMON',18,_binary 'aT<ñ)l*¨'),(_binary '\Z.T<ñ)l*¨','main','git commit -m \'fix: resolve conflict\'','COMMON',19,_binary 'aT<ñ)l*¨');
/*!40000 ALTER TABLE `single_command_set_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `single_ranking`
--

DROP TABLE IF EXISTS `single_ranking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `single_ranking` (
  `single_ranking_id` binary(16) NOT NULL,
  `difficulty` enum('EASY','HARD','NORMAL') NOT NULL,
  `grade` enum('A','B','C','D','F','S') DEFAULT NULL,
  `member_id` binary(16) NOT NULL,
  `rank` int NOT NULL,
  `play_time` int DEFAULT NULL COMMENT 'íë ì´ ìê° (ms), playTime ëì ì  ë°ì´í°ë NULL',
  `recorded_at` datetime(6) NOT NULL,
  `score` int NOT NULL,
  `week` varchar(10) NOT NULL,
  PRIMARY KEY (`single_ranking_id`),
  UNIQUE KEY `uq_single_ranking` (`member_id`,`difficulty`,`week`),
  KEY `idx_single_ranking_difficulty_week_rank` (`difficulty`,`week`,`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `single_ranking`
--

LOCK TABLES `single_ranking` WRITE;
/*!40000 ALTER TABLE `single_ranking` DISABLE KEYS */;
/*!40000 ALTER TABLE `single_ranking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `single_result`
--

DROP TABLE IF EXISTS `single_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `single_result` (
  `single_result_id` binary(16) NOT NULL,
  `difficulty` enum('EASY','HARD','NORMAL') NOT NULL,
  `grade` enum('A','B','C','D','F','S') NOT NULL,
  `member_id` binary(16) NOT NULL,
  `play_time` int DEFAULT NULL,
  `played_at` datetime(6) NOT NULL,
  `score` int NOT NULL,
  `session_id` varchar(100) NOT NULL,
  `status` enum('GAMEOVER','SUCCESS') NOT NULL,
  PRIMARY KEY (`single_result_id`),
  UNIQUE KEY `uq_single_result_session` (`session_id`),
  KEY `idx_single_result_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `single_result`
--

LOCK TABLES `single_result` WRITE;
/*!40000 ALTER TABLE `single_result` DISABLE KEYS */;
/*!40000 ALTER TABLE `single_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timeattack_result`
--

DROP TABLE IF EXISTS `timeattack_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timeattack_result` (
  `timeattack_result_id` binary(16) NOT NULL,
  `played_at` datetime(6) NOT NULL,
  `room_id` bigint NOT NULL,
  `session_id` varchar(100) NOT NULL,
  PRIMARY KEY (`timeattack_result_id`),
  UNIQUE KEY `uq_timeattack_result_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timeattack_result`
--

LOCK TABLES `timeattack_result` WRITE;
/*!40000 ALTER TABLE `timeattack_result` DISABLE KEYS */;
/*!40000 ALTER TABLE `timeattack_result` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timeattack_result_member`
--

DROP TABLE IF EXISTS `timeattack_result_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timeattack_result_member` (
  `timeattack_result_member_id` binary(16) NOT NULL,
  `is_winner` bit(1) NOT NULL,
  `member_id` binary(16) NOT NULL,
  `timeattack_result_id` binary(16) NOT NULL,
  `total_count` int NOT NULL,
  PRIMARY KEY (`timeattack_result_member_id`),
  UNIQUE KEY `uq_timeattack_result_member` (`timeattack_result_id`,`member_id`),
  KEY `idx_timeattack_result_member_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timeattack_result_member`
--

LOCK TABLES `timeattack_result_member` WRITE;
/*!40000 ALTER TABLE `timeattack_result_member` DISABLE KEYS */;
/*!40000 ALTER TABLE `timeattack_result_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutorial_step`
--

DROP TABLE IF EXISTS `tutorial_step`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutorial_step` (
  `tutorial_step_id` binary(16) NOT NULL,
  `description` varchar(500) NOT NULL,
  `step_order` int NOT NULL,
  `title` varchar(100) NOT NULL,
  PRIMARY KEY (`tutorial_step_id`),
  UNIQUE KEY `uq_tutorial_step_order` (`step_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutorial_step`
--

LOCK TABLES `tutorial_step` WRITE;
/*!40000 ALTER TABLE `tutorial_step` DISABLE KEYS */;
INSERT INTO `tutorial_step` VALUES (_binary '\nôT<ñ)l*¨','ê³ ìì´ê° ì¡°ê¸ ì¤ìê° ìì¸ íì¶ íë¡ê·¸ë¨ì ì½ëë¥¼ ì§ì ë³´ë´ê³  ìì´ì. ë¹ì ì PMì´ ëì´ íë¡ì í¸ë¥¼ ìì±í´ì¼ í´ì.',1,'ê³ ìì´ì ëì'),(_binary '\Î\áT<ñ)l*¨','ì¼ìª½ì ëª©ì¨(ìµë 3ê°)ê³¼ ì½¤ë³´ê° ìì´ì. ì°ìì¼ë¡ ëªë ¹ì´ë¥¼ ì±ê³µíë©´ ì½¤ë³´ê° ì¬ë¼ê°ê³ , ëê¹ì§ ì²ë¦¬íì§ ëª»íë©´ ëª©ì¨ì´ ì¤ì´ì.',2,'ëª©ì¨ê³¼ ì½¤ë³´'),(_binary 'T<ñ)l*¨','ëªë ¹ì´ ë¸ëê° ë¸ëì¹ë¥¼ ë°ë¼ ë´ë ¤ìì. íë¨ ìë ¥ì°½ìì ëªë ¹ì´ë¥¼ ìë ¥í  ì ìì´ì. ì²« ëªë ¹ì´ë¥¼ ì²ë¦¬í´ë´ì!',3,'git add ëªë ¹ì´'),(_binary '	T<ñ)l*¨','ìë ¥ì°½ ìì ë¸ëì¹ëªì´ íì¬ ìì¹ìì. ë°©ê¸ ìë ¥í ë´ì©ì íë¨ íì¤í ë¦¬ì ê¸°ë¡ë¼ì! ì²ë¦¬í  ëë§ë¤ ì¤ë¥¸ìª½ ì¸ë¥´ê° í ì¹¸ì© ìì¬ì. ê³ ìì´ê¹ì§ ì±ì°ë©´ íì¶ ì±ê³µ!',4,'íì¤í ë¦¬ & íì¶ë¡ í¥íë ì¸ë¥´'),(_binary 'LT<ñ)l*¨','ì¤íì´ì§í ë´ì©ì ì»¤ë°ì¼ë¡ ë¨ê²¨ì. â íìê° ìë ë¸ëë¥¼ ì²ë¦¬íë©´ ëì  ëªë ¹ì´ ë¸ëë¥¼ ì²ë¦¬í´ì£¼ë cherry-pick ìì´íì ë°ìì!',5,'git commit / git stash ëªë ¹ì´'),(_binary '!\'²T<ñ)l*¨','main ë¸ëì¹ë¥¼ ìê²© ì ì¥ìì ì¬ë ¤ì. â¥ ë¸ëë ì²ë¦¬íë©´ ëª©ì¨ì 1ê° íë³µí  ì ìë restore ìì´íì ë°ìì!',6,'git push / git restore ëªë ¹ì´'),(_binary '\')¡T<ñ)l*¨','ì ë¸ëì¹ë¥¼ ë§ë¤ì´ íì¶ ëª¨ë ììì ë¶ë¦¬í´ë´ì! â° ë¸ëë ëíë¥¼ 5ì´ê° ë©ì¶ë stash ìì´íì´ìì.',7,'git switch -c / git stash ëªë ¹ì´'),(_binary '.\â\ÍT<ñ)l*¨','ì§ì  ìë ¥ ëì  cherry-pick ìì´íì ì¨ì feat ì»¤ë°ì ìëì¼ë¡ ì²ë¦¬í´ë´ì!',8,'cherry-pick ìì´í ì¬ì©'),(_binary '4\ÃT<ñ)l*¨','íì¶ ëª¨ë ê°ë°ì´ ëë¬ì´ì! feat/escape ë¸ëì¹ìì ììí ë´ì©ì ìê²© ì ì¥ìì ì¬ë ¤ë´ì.',9,'git push ëªë ¹ì´'),(_binary ':ü¼T<ñ)l*¨','main ë¸ëì¹ë¡ ëìê°ì ììì í©ì³ë³¼ ê±°ìì. git switch [ë¸ëì¹ëª]ì¼ë¡ ë¤ë¥¸ ë¸ëì¹ë¡ ì´ëí  ì ìì´ì. Easy ëª¨ëìì  ìë ¤ì£¼ì§ë§, normal ì´ìì ëª¨ëìì  ì§ì  ì´ëí´ì¼í´ì.',10,'git switch ëªë ¹ì´'),(_binary '@\ÏþT<ñ)l*¨','ëªë ¹ì´ë¥¼ ë¹ ë¥´ê² ì²ë¦¬íì§ ëª»íë©´ ëª©ì¨ì´ íë ì¤ì´ë¤ì´ì. ë¤ì ë¨ê³ìì íë³µí´ë´ì!',11,'ëªë ¹ì´ë¥¼ ëì³¤ì´ì!'),(_binary 'B\è%T<ñ)l*¨','ìê¹ ì»ì restore ìì´íì ì¬ì©í´ì ëª©ì¨ì íë³µí´ë´ì! Alt+3ì ëë¥´ê±°ë ìì´í ì¬ë¡¯ì í´ë¦­íë©´ ë¼ì.',12,'íë³µ ìì´í ì¬ì©'),(_binary 'D\ì2T<ñ)l*¨','ë§ì§ë§ ëªë ¹ì´ìì! main ë¸ëì¹ì feat/escape ììì í©ì³ íì¶í´ë´ì!',13,'íì¶!');
/*!40000 ALTER TABLE `tutorial_step` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutorial_step_item`
--

DROP TABLE IF EXISTS `tutorial_step_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutorial_step_item` (
  `tutorial_step_item_id` binary(16) NOT NULL,
  `content` varchar(255) NOT NULL,
  `explanation` varchar(500) DEFAULT NULL,
  `sequence` int NOT NULL,
  `tutorial_step_id` binary(16) NOT NULL,
  PRIMARY KEY (`tutorial_step_item_id`),
  UNIQUE KEY `uq_tutorial_step_item` (`tutorial_step_id`,`sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutorial_step_item`
--

LOCK TABLES `tutorial_step_item` WRITE;
/*!40000 ALTER TABLE `tutorial_step_item` DISABLE KEYS */;
INSERT INTO `tutorial_step_item` VALUES (_binary '\ë¬T<ñ)l*¨','git clone https://tutorial.git','ìê²© ì ì¥ìë¥¼ ë´ ì»´í¨í°ë¡ ë³µì¬í´ìµëë¤. ì íë¡ì í¸ì ì°¸ì¬í  ë ê°ì¥ ë¨¼ì  ì¤ííë ëªë ¹ì´ìì.',1,_binary '\nôT<ñ)l*¨'),(_binary '\ÂT<ñ)l*¨','git add .','ë³ê²½ë ì ì²´ íì¼ì ì¤íì´ì§ ìì­ì ì¶ê°í©ëë¤. ì»¤ë°ì¼ë¡ ê¸°ë¡íê¸° ì  \'ì¤ë¹ ìë£\' íìë¥¼ íë ëìì´ìì.',1,_binary 'T<ñ)l*¨'),(_binary '\Ò\ÒT<ñ)l*¨','git commit -m \'chore: initial setting\'','ì¤íì´ì§ë ë³ê²½ì¬í­ì ì ì¥ìì ìêµ¬í ê¸°ë¡í©ëë¤. -m ìµìì¼ë¡ ì»¤ë° ë©ìì§ë¥¼ ë¶ì¬ì. \ncherry-pick: ë¤ë¥¸ ë¸ëì¹ì ìë í¹ì  ì»¤ë° íëë§ ê³¨ë¼ íì¬ ë¸ëì¹ì ì ì©íë ëªë ¹ì´ìì.',1,_binary 'LT<ñ)l*¨'),(_binary '$£[T<ñ)l*¨','git push origin main','ë¡ì»¬ ë¸ëì¹ì ì»¤ë°ì ìê²© ì ì¥ì(origin)ì ìë¡ëí©ëë¤. íìë¤ì´ ë´ ììì ë³¼ ì ìê² ë¼ì. \nrestore: ìì íì¼ì ë§ì§ë§ ì»¤ë° ìíë¡ ëëë¦¬ë ëªë ¹ì´ìì.',1,_binary '!\'²T<ñ)l*¨'),(_binary '+0T<ñ)l*¨','git switch -c feat/escape','git switch -cë ì ë¸ëì¹ë¥¼ ë§ë¤ë©´ì ëìì ì´ëí©ëë¤. -cë createì ì½ììì. \nstash: ì»¤ë°íì§ ìì ë³ê²½ì¬í­ì ììë¡ ì ì¥í´ëë ëªë ¹ì´ìì.',1,_binary '\')¡T<ñ)l*¨'),(_binary '2ýT<ñ)l*¨','git commit -m \'feat: implement escape module\'','featì ê¸°ë¥ ì¶ê°ë¥¼ ëíë´ë ì»¤ë° ë©ìì§ ì ëì´ìì. ì´ì¸ìë fix(ë²ê·¸ ìì ), docs(ë¬¸ì ë³ê²½), style(ì½ë í¬ë§·í), refactor(ì½ë ë¦¬í©í ë§) ë±ì´ ìì´ì.',1,_binary '.\â\ÍT<ñ)l*¨'),(_binary '8\êQT<ñ)l*¨','git push origin feat/escape','git push origin [ë¸ëì¹]ë ë¡ì»¬ ì»¤ë°ì ìê²© ì ì¥ìì ìë¡ëí´ì. originì ìê²© ì ì¥ìì ê¸°ë³¸ ë³ëªì´ìì.',1,_binary '4\ÃT<ñ)l*¨'),(_binary '>»@T<ñ)l*¨','git switch main','git switch [ë¸ëì¹ëª]ì ë¤ë¥¸ ë¸ëì¹ë¡ ì´ëí´ì. -c ìµì ìì´ ì¬ì©íë©´ ê¸°ì¡´ ë¸ëì¹ë¡ ì´ëë§ í©ëë¤.',1,_binary ':ü¼T<ñ)l*¨'),(_binary 'H&T<ñ)l*¨','git merge feat/escape','git merge [ë¸ëì¹ëª]ì íì¬ ë¸ëì¹ì ë¤ë¥¸ ë¸ëì¹ì ë³ê²½ì¬í­ì í©ì³ì. mainì feat/escapeë¥¼ í©ì³ ëª¨ë  ììì íëë¡ íµí©í©ëë¤.',1,_binary 'D\ì2T<ñ)l*¨');
/*!40000 ALTER TABLE `tutorial_step_item` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-21 10:37:50