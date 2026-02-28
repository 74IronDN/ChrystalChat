class CrystalChat {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.currentChat = null;
        this.currentTheme = 'light';
        this.baseUrl = window.location.origin;
        this.init();
    }

    async init() {
        this.loadFromStorage();
        this.setupEventListeners();
        await this.autoLogin();
        this.render();
    }

    loadFromStorage() {
        this.token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
        this.currentTheme = localStorage.getItem('theme') || 'light';
        document.body.className = `theme-${this.currentTheme}`;
    }

    saveToStorage() {
        if (this.token) localStorage.setItem('token', this.token);
        if (this.currentUser) localStorage.setItem('user', JSON.stringify(this.currentUser));
        localStorage.setItem('theme', this.currentTheme);
    }

    async autoLogin() {
        if (this.token && this.currentUser) {
            try {
                const response = await fetch('/api/users/profile', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.saveToStorage();
                    this.showMainInterface();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Ошибка автологина:', error);
                this.logout();
            }
        }
    }

    logout() {
        if (this.token) {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            }).catch(() => {});
        }
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.showAuthScreen();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="login"]')) this.showLoginForm();
            if (e.target.matches('[data-action="register"]')) this.showRegisterForm();
            if (e.target.matches('[data-action="logout"]')) this.logout();
            if (e.target.matches('[data-action="toggle-theme"]')) this.toggleTheme();
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.body.className = `theme-${this.currentTheme}`;
        this.saveToStorage();
        
        if (this.currentUser) {
            fetch('/api/users/theme', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme: this.currentTheme })
            }).catch(() => {});
        }
    }

    showAuthScreen() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="welcome-container">
                <h1>CrystalChat</h1>
                <p>Масштабный мессенджер с NFT-подарками</p>
                <div class="auth-buttons">
                    <button data-action="login">Войти</button>
                    <button data-action="register">Зарегистрироваться</button>
                </div>
            </div>
        `;
    }

    async showLoginForm() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <h2>Вход в CrystalChat</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label>Nickname:</label>
                        <input type="text" id="nickname" required>
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit">Войти</button>
                </form>
                <p>Нет аккаунта? <button data-action="register">Зарегистрироваться</button></p>
            </div>
        `;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nickname = document.getElementById('nickname').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();
                if (response.ok) {
                    this.token = data.token;
                    this.currentUser = data.user;
                    this.saveToStorage();
                    this.showMainInterface();
                } else {
                    alert(data.error || 'Ошибка входа');
                }
            } catch (error) {
                alert('Ошибка соединения');
            }
        });
    }

    showRegisterForm() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <h2>Регистрация в CrystalChat</h2>
                <form id="registerForm">
                    <div class="form-group">
                        <label>Nickname:</label>
                        <input type="text" id="nickname" required>
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit">Продолжить</button>
                </form>
                <p>Уже есть аккаунт? <button data-action="login">Войти</button></p>
            </div>
        `;

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nickname = document.getElementById('nickname').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                const data = await response.json();
                if (response.ok) {
                    this.token = data.token;
                    this.currentUser = data.user;
                    this.saveToStorage();
                    this.showUsernameSelection();
                } else {
                    alert(data.error || 'Ошибка регистрации');
                }
            } catch (error) {
                alert('Ошибка соединения');
            }
        });
    }

    showUsernameSelection() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="auth-container">
                <h2>Выберите уникальный юзернейм</h2>
                <form id="usernameForm">
                    <div class="form-group">
                        <label>Username:</label>
                        <input type="text" id="username" required placeholder="Например: IronDN">
                    </div>
                    <button type="submit">Подтвердить</button>
                </form>
            </div>
        `;

        document.getElementById('usernameForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;

            try {
                const response = await fetch('/api/auth/set-username', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username })
                });

                const data = await response.json();
                if (response.ok) {
                    this.currentUser = data.user;
                    this.saveToStorage();
                    this.showMainInterface();
                } else {
                    alert(data.error || 'Этот юзернейм уже занят');
                }
            } catch (error) {
                alert('Ошибка соединения');
            }
        });
    }

    showMainInterface() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="messenger-container">
                <div class="sidebar">
                    <div class="user-profile">
                        <div class="user-info">
                            <span class="nickname">${this.currentUser.nickname}</span>
                            <span class="username">@${this.currentUser.username || 'не установлен'}</span>
                        </div>
                        <div class="user-stats">
                            <span class="stars">⭐ ${this.currentUser.stars || 0}</span>
                            ${this.currentUser.premiumUntil > Date.now()/1000 ? '<span class="premium-badge">PREMIUM</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="sidebar-menu">
                        <button class="menu-item active" data-section="chats">Чаты</button>
                        <button class="menu-item" data-section="groups">Группы</button>
                        <button class="menu-item" data-section="channels">Каналы</button>
                        <button class="menu-item" data-section="gifts">NFT-подарки</button>
                        <button class="menu-item" data-section="auction">Аукцион</button>
                        <button class="menu-item" data-section="settings">Настройки</button>
                        ${this.currentUser.username === 'IronDN' ? '<button class="menu-item" data-section="admin">Админ-панель</button>' : ''}
                    </div>
                    
                    <div class="sidebar-footer">
                        <button data-action="toggle-theme">Сменить тему</button>
                        <button data-action="logout">Выйти</button>
                    </div>
                </div>
                
                <div class="main-content" id="mainContent">
                    <!-- Контент будет загружаться динамически -->
                </div>
            </div>
        `;

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.loadSection(item.dataset.section);
            });
        });

        this.loadSection('chats');
    }

    async loadSection(section) {
        switch(section) {
            case 'chats':
                await this.loadChats();
                break;
            case 'groups':
                await this.loadGroups();
                break;
            case 'channels':
                await this.loadChannels();
                break;
            case 'gifts':
                await this.loadGifts();
                break;
            case 'auction':
                await this.loadAuctions();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'admin':
                if (this.currentUser.username === 'IronDN') {
                    await this.loadAdminPanel();
                }
                break;
        }
    }

    async loadChats() {
        try {
            const response = await fetch('/api/users/chats', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="chats-container">
                    <div class="chats-list">
                        <h3>Личные сообщения</h3>
                        <input type="text" placeholder="Поиск..." class="search-input" id="searchUsers">
                        <div class="chats">
                            ${data.chats.map(chat => `
                                <div class="chat-item" data-userid="${chat.userId}">
                                    <span class="chat-name">${chat.nickname}</span>
                                    <span class="chat-status ${chat.online ? 'online' : 'offline'}"></span>
                                </div>
                            `).join('')}
                        </div>
                        <button class="new-chat-btn" onclick="chat.startNewChat()">Новый чат</button>
                    </div>
                    <div class="chat-messages" id="chatMessages">
                        <div class="no-chat-selected">Выберите чат</div>
                    </div>
                </div>
            `;

            document.getElementById('searchUsers').addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });

            document.querySelectorAll('.chat-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.openChat(item.dataset.userid);
                });
            });
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
        }
    }

    async openChat(userId) {
        this.currentChat = { type: 'private', id: userId };
        
        try {
            const response = await fetch(`/api/messages/${userId}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const messagesDiv = document.getElementById('chatMessages');
            messagesDiv.innerHTML = `
                <div class="messages-container">
                    <div class="messages-list">
                        ${data.messages.map(msg => `
                            <div class="message ${msg.senderId == this.currentUser.id ? 'outgoing' : 'incoming'}">
                                <div class="message-text">${msg.text}</div>
                                <div class="message-time">${new Date(msg.createdAt * 1000).toLocaleTimeString()}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="message-input-container">
                        <input type="text" id="messageText" placeholder="Введите сообщение...">
                        <button onclick="chat.sendMessage()">Отправить</button>
                    </div>
                </div>
            `;

            document.getElementById('messageText').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }

    async sendMessage() {
        const input = document.getElementById('messageText');
        const text = input.value.trim();
        
        if (!text || !this.currentChat) return;
        
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: this.currentChat.id,
                    text: text
                })
            });
            
            if (response.ok) {
                input.value = '';
                this.openChat(this.currentChat.id);
            }
        } catch (error) {
            console.error('Ошибка отправки:', error);
        }
    }

    async searchUsers(query) {
        if (query.length < 2) return;
        
        try {
            const response = await fetch(`/api/users/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            console.log('Результаты поиска:', data.users);
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }

    async startNewChat() {
        const username = prompt('Введите username пользователя:');
        if (!username) return;
        
        try {
            const response = await fetch(`/api/users/by-username/${username}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            if (response.ok) {
                this.openChat(data.user.id);
            } else {
                alert('Пользователь не найден');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async loadGroups() {
        try {
            const response = await fetch('/api/groups', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="groups-container">
                    <h3>Мои группы</h3>
                    <button class="create-group-btn" onclick="chat.showCreateGroup()">Создать группу</button>
                    <div class="groups-list">
                        ${data.groups.map(group => `
                            <div class="group-item" data-groupid="${group.id}">
                                <span class="group-name">${group.name}</span>
                                <span class="group-members">👥 ${group.memberCount}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки групп:', error);
        }
    }

    async loadChannels() {
        try {
            const response = await fetch('/api/channels', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="channels-container">
                    <h3>Каналы</h3>
                    <button class="create-channel-btn" onclick="chat.showCreateChannel()">Создать канал</button>
                    <div class="channels-list">
                        ${data.channels.map(channel => `
                            <div class="channel-item" data-channelid="${channel.id}">
                                <span class="channel-name">${channel.name}</span>
                                <span class="channel-subscribers">👥 ${channel.subscriberCount}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки каналов:', error);
        }
    }

    async loadGifts() {
        try {
            const response = await fetch('/api/gifts', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="gifts-container">
                    <h3>NFT-подарки</h3>
                    <div class="user-gifts">
                        <h4>Мои подарки</h4>
                        <div class="gifts-grid">
                            ${data.myGifts.map(gift => `
                                <div class="gift-card">
                                    <img src="${gift.imageUrl}" alt="${gift.name}">
                                    <h5>${gift.name}</h5>
                                    <p>${gift.description}</p>
                                    ${gift.senderName ? `<small>От: ${gift.isAnonymous ? 'Аноним' : gift.senderName}</small>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="available-gifts">
                        <h4>Доступные подарки</h4>
                        <div class="gifts-grid">
                            ${data.availableGifts.map(gift => `
                                <div class="gift-card">
                                    <img src="${gift.imageUrl}" alt="${gift.name}">
                                    <h5>${gift.name}</h5>
                                    <p>${gift.description}</p>
                                    <p class="gift-price">⭐ ${gift.price}</p>
                                    <button onclick="chat.buyGift(${gift.id})">Купить</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки подарков:', error);
        }
    }

    async loadAuctions() {
        try {
            const response = await fetch('/api/auction/items', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="auction-container">
                    <h3>Аукцион (фиксированные цены)</h3>
                    <div class="auction-items">
                        ${data.items.map(item => `
                            <div class="auction-item">
                                <h4>${item.name}</h4>
                                <p>Тип: ${item.type === 'username' ? 'Юзернейм' : 'NFT-подарок'}</p>
                                <p class="auction-price">⭐ ${item.price}</p>
                                <button onclick="chat.buyAuctionItem(${item.id})">Купить</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки аукциона:', error);
        }
    }

    loadSettings() {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="settings-container">
                <h3>Настройки</h3>
                
                <div class="settings-section">
                    <h4>Приватность</h4>
                    <label>
                        <input type="checkbox" id="allowGroupInvites" ${this.currentUser.allowGroupInvites ? 'checked' : ''}>
                        Разрешить приглашения в группы
                    </label>
                    <label>
                        <input type="checkbox" id="allowChannelInvites" ${this.currentUser.allowChannelInvites ? 'checked' : ''}>
                        Разрешить приглашения в каналы
                    </label>
                    <label>
                        <input type="checkbox" id="showOnlineStatus" ${this.currentUser.showOnlineStatus ? 'checked' : ''}>
                        Показывать онлайн-статус
                    </label>
                    <label>
                        <input type="checkbox" id="showTypingStatus" ${this.currentUser.showTypingStatus ? 'checked' : ''}>
                        Показывать "печатает..."
                    </label>
                </div>
                
                <div class="settings-section">
                    <h4>Звёзды</h4>
                    <p>Баланс: ⭐ ${this.currentUser.stars || 0}</p>
                    <button onclick="window.open('https://www.donationalerts.com/r/irondn', '_blank')">
                        Пополнить звёзды
                    </button>
                </div>
                
                <div class="settings-section">
                    <h4>Премиум</h4>
                    ${this.currentUser.premiumUntil > Date.now()/1000 ? 
                        `<p>Премиум активен до: ${new Date(this.currentUser.premiumUntil * 1000).toLocaleDateString()}</p>` : 
                        `<p>Премиум не активен</p>`
                    }
                    <button onclick="window.open('https://www.donationalerts.com/r/irondn', '_blank')">
                        Купить премиум
                    </button>
                </div>
                
                <button onclick="chat.saveSettings()" class="save-settings-btn">Сохранить настройки</button>
            </div>
        `;
    }

    async saveSettings() {
        const settings = {
            allowGroupInvites: document.getElementById('allowGroupInvites').checked ? 1 : 0,
            allowChannelInvites: document.getElementById('allowChannelInvites').checked ? 1 : 0,
            showOnlineStatus: document.getElementById('showOnlineStatus').checked ? 1 : 0,
            showTypingStatus: document.getElementById('showTypingStatus').checked ? 1 : 0
        };
        
        try {
            const response = await fetch('/api/users/privacy', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                alert('Настройки сохранены');
                Object.assign(this.currentUser, settings);
                this.saveToStorage();
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    }

    async loadAdminPanel() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            
            const mainContent = document.getElementById('mainContent');
            mainContent.innerHTML = `
                <div class="admin-container">
                    <h3>Админ-панель</h3>
                    
                    <div class="admin-stats">
                        <div class="stat-card">
                            <h4>Пользователи</h4>
                            <p>${data.users}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Сообщения</h4>
                            <p>${data.messages}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Группы</h4>
                            <p>${data.groups}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Каналы</h4>
                            <p>${data.channels}</p>
                        </div>
                    </div>
                    
                    <div class="admin-actions">
                        <h4>Управление звёздами</h4>
                        <input type="text" id="adminUsername" placeholder="Username">
                        <input type="number" id="adminStars" placeholder="Количество звёзд">
                        <button onclick="chat.adminAddStars()">Начислить</button>
                        <button onclick="chat.adminRemoveStars()">Забрать</button>
                    </div>
                    
                    <div class="admin-actions">
                        <h4>Управление премиум</h4>
                        <input type="text" id="premiumUsername" placeholder="Username">
                        <select id="premiumDuration">
                            <option value="30">1 месяц</option>
                            <option value="90">3 месяца</option>
                            <option value="365">12 месяцев</option>
                        </select>
                        <button onclick="chat.adminAddPremium()">Выдать премиум</button>
                        <button onclick="chat.adminRemovePremium()">Забрать премиум</button>
                    </div>
                    
                    <div class="admin-actions">
                        <h4>Аукцион</h4>
                        <select id="auctionType">
                            <option value="username">Юзернейм</option>
                            <option value="nft">NFT-подарок</option>
                        </select>
                        <input type="text" id="auctionItem" placeholder="ID предмета">
                        <input type="number" id="auctionPrice" placeholder="Цена в звёздах">
                        <button onclick="chat.adminAddAuctionItem()">Выставить лот</button>
                    </div>
                    
                    <div class="admin-actions">
                        <h4>Управление пользователями</h4>
                        <input type="text" id="banUsername" placeholder="Username">
                        <button onclick="chat.adminBanUser()">Забанить</button>
                        <button onclick="chat.adminDeleteUser()">Удалить аккаунт</button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки админ-панели:', error);
        }
    }

    async buyGift(giftId) {
        if (!confirm('Вы точно хотите купить этот подарок?')) return;
        
        try {
            const response = await fetch('/api/gifts/buy', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ giftId })
            });
            
            const data = await response.json();
            if (response.ok) {
                alert('Подарок успешно куплен!');
                this.loadGifts();
            } else {
                alert(data.error || 'Ошибка покупки');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async buyAuctionItem(itemId) {
        if (!confirm('Вы точно хотите купить этот лот?')) return;
        
        try {
            const response = await fetch('/api/auction/buy', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itemId })
            });
            
            const data = await response.json();
            if (response.ok) {
                alert('Покупка успешно совершена!');
                this.loadAuctions();
            } else {
                alert(data.error || 'Ошибка покупки');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminAddStars() {
        const username = document.getElementById('adminUsername').value;
        const stars = document.getElementById('adminStars').value;
        
        if (!username || !stars) return alert('Заполните все поля');
        
        try {
            const response = await fetch('/api/admin/stars/add', {
                method: 'POST',
                headers
'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, amount: parseInt(stars) })
            });
            
            if (response.ok) {
                alert('Звёзды начислены');
                this.loadAdminPanel();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminRemoveStars() {
        const username = document.getElementById('adminUsername').value;
        const stars = document.getElementById('adminStars').value;
        
        if (!username || !stars) return alert('Заполните все поля');
        
        try {
            const response = await fetch('/api/admin/stars/remove', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, amount: parseInt(stars) })
            });
            
            if (response.ok) {
                alert('Звёзды списаны');
                this.loadAdminPanel();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminAddPremium() {
        const username = document.getElementById('premiumUsername').value;
        const duration = parseInt(document.getElementById('premiumDuration').value);
        
        if (!username) return alert('Введите username');
        
        try {
            const response = await fetch('/api/admin/premium/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, duration })
            });
            
            if (response.ok) {
                alert('Премиум выдан');
                this.loadAdminPanel();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminRemovePremium() {
        const username = document.getElementById('premiumUsername').value;
        
        if (!username) return alert('Введите username');
        
        try {
            const response = await fetch('/api/admin/premium/remove', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            if (response.ok) {
                alert('Премиум забран');
                this.loadAdminPanel();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminAddAuctionItem() {
        const type = document.getElementById('auctionType').value;
        const itemId = document.getElementById('auctionItem').value;
        const price = document.getElementById('auctionPrice').value;
        
        if (!itemId || !price) return alert('Заполните все поля');
        
        try {
            const response = await fetch('/api/admin/auction/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, itemId: parseInt(itemId), price: parseInt(price) })
            });
            
            if (response.ok) {
                alert('Лот выставлен');
                this.loadAdminPanel();
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminBanUser() {
        const username = document.getElementById('banUsername').value;
        
        if (!username) return alert('Введите username');
        
        try {
            const response = await fetch('/api/admin/ban', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            if (response.ok) {
                alert('Пользователь забанен');
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }

    async adminDeleteUser() {
        const username = document.getElementById('banUsername').value;
        
        if (!username) return alert('Введите username');
        if (!confirm(`Вы точно хотите удалить пользователя ${username}?`)) return;
        
        try {
            const response = await fetch('/api/admin/delete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            if (response.ok) {
                alert('Пользователь удален');
            } else {
                const data = await response.json();
                alert(data.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }
}

// Инициализация при загрузке страницы
let chat;
window.onload = () => {
    chat = new CrystalChat();
    window.chat = chat;
};
