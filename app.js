const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных
const db = new sqlite3.Database('./database.db');

// Создание таблиц
db.serialize(() => {
    // Пользователи
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL,
        username TEXT UNIQUE,
        passwordHash TEXT NOT NULL,
        theme TEXT DEFAULT 'light',
        allowGroupInvites INTEGER DEFAULT 1,
        allowChannelInvites INTEGER DEFAULT 1,
        showOnlineStatus INTEGER DEFAULT 1,
        showTypingStatus INTEGER DEFAULT 1,
        stars INTEGER DEFAULT 0,
        premiumUntil INTEGER DEFAULT 0,
        isBanned INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )`);

    // Дополнительные юзернеймы
    db.run(`CREATE TABLE IF NOT EXISTS usernames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        username TEXT UNIQUE NOT NULL,
        isPrimary INTEGER DEFAULT 0,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Группы
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        isPrivate INTEGER DEFAULT 1,
        allowInvites INTEGER DEFAULT 1,
        allowMessages INTEGER DEFAULT 1,
        ownerId INTEGER NOT NULL,
        createdAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(ownerId) REFERENCES users(id)
    )`);

    // Участники групп
    db.run(`CREATE TABLE IF NOT EXISTS groupMembers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joinedAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(groupId) REFERENCES groups(id),
        FOREIGN KEY(userId) REFERENCES users(id),
        UNIQUE(groupId, userId)
    )`);

    // Каналы
    db.run(`CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        allowComments INTEGER DEFAULT 1,
        ownerId INTEGER NOT NULL,
        createdAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(ownerId) REFERENCES users(id)
    )`);

    // Подписчики каналов
    db.run(`CREATE TABLE IF NOT EXISTS channelSubscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        role TEXT DEFAULT 'subscriber',
        subscribedAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(channelId) REFERENCES channels(id),
        FOREIGN KEY(userId) REFERENCES users(id),
        UNIQUE(channelId, userId)
    )`);

    // Сообщения
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        receiverId INTEGER,
        groupId INTEGER,
        channelId INTEGER,
        text TEXT,
        type TEXT DEFAULT 'text',
        attachment TEXT,
        edited INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(senderId) REFERENCES users(id),
        FOREIGN KEY(receiverId) REFERENCES users(id),
        FOREIGN KEY(groupId) REFERENCES groups(id),
        FOREIGN KEY(channelId) REFERENCES channels(id)
    )`);

    // NFT-подарки
    db.run(`CREATE TABLE IF NOT EXISTS nftGifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        imageUrl TEXT DEFAULT '/gifts/default.png',
        animationUrl TEXT,
        price INTEGER NOT NULL,
        isUnique INTEGER DEFAULT 1,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )`);

    // Инвентарь пользователей (подарки)
    db.run(`CREATE TABLE IF NOT EXISTS userGifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        giftId INTEGER NOT NULL,
        giftType TEXT DEFAULT 'nft',
        senderId INTEGER,
        isAnonymous INTEGER DEFAULT 0,
        receivedAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(giftId) REFERENCES nftGifts(id),
        FOREIGN KEY(senderId) REFERENCES users(id)
    )`);

    // Аукцион (лоты)
    db.run(`CREATE TABLE IF NOT EXISTS auctions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        itemType TEXT NOT NULL,
        itemId INTEGER NOT NULL,
        price INTEGER NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    )`);

    // Транзакции звёзд
    db.run(`CREATE TABLE IF NOT EXISTS starTransactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Сессии
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt INTEGER NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // Добавляем тестовые NFT-подарки
    db.get("SELECT COUNT(*) as count FROM nftGifts", (err, row) => {
        if (row.count === 0) {
            const insertNFT = db.prepare("INSERT INTO nftGifts (name, description, imageUrl, price) VALUES (?, ?, ?, ?)");
            insertNFT.run('Золотой кристалл', 'Уникальный анимированный подарок', '/gifts/gold-crystal.png', 500);
            insertNFT.run('Серебряная звезда', 'Редкий подарок', '/gifts/silver-star.png', 300);
            insertNFT.run('Бриллиантовое сердце', 'Эксклюзивный подарок', '/gifts/diamond-heart.png', 1000);
        }
    });
});

// Сохраняем db в app для использования в маршрутах
app.set('db', db);
app.set('JWT_SECRET', 'crystalchat-secret-key-2024');

// Подключение маршрутов
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/stars', require('./routes/stars'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/auction', require('./routes/auction'));
app.use('/api/admin', require('./routes/admin'));

module.exports = app;
