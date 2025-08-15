// Admin Authentication System
// Hard-coded credentials and Two-Factor Authentication

class AdminAuth {
    constructor() {
        this.isAuthenticated = false;
        this.is2FAVerified = false;
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.lockoutUntil = 0;
        
        // Hard-coded admin credentials (CHANGE THESE IN PRODUCTION!)
        this.adminCredentials = {
            username: 'admin',
            password: 'admin123',
            // 2FA secret key (generate a random one for production)
            secret2FA: 'JBSWY3DPEHPK3PXP'
        };
        
        this.init();
    }
    
    init() {
        this.checkStoredAuth();
        this.setupEventListeners();
        this.checkLockout();
    }
    
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // 2FA form submission
        const twoFAForm = document.getElementById('twoFAForm');
        if (twoFAForm) {
            twoFAForm.addEventListener('submit', (e) => this.handle2FA(e));
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Show/hide password toggle
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }
    }
    
    checkStoredAuth() {
        const storedAuth = localStorage.getItem('adminAuth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                if (authData.isAuthenticated && authData.is2FAVerified) {
                    this.isAuthenticated = true;
                    this.is2FAVerified = true;
                    this.showAdminPanel();
                }
            } catch (e) {
                console.error('Error parsing stored auth:', e);
                localStorage.removeItem('adminAuth');
            }
        }
    }
    
    checkLockout() {
        if (this.lockoutUntil > Date.now()) {
            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
            this.showLockoutMessage(remainingTime);
        }
    }
    
    showLockoutMessage(minutes) {
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.innerHTML = `
                <div class="lockout-message">
                    <h3>🔒 Account Locked</h3>
                    <p>Too many failed login attempts. Please try again in ${minutes} minutes.</p>
                    <div class="countdown" id="lockoutCountdown"></div>
                </div>
            `;
            
            // Start countdown
            this.startLockoutCountdown();
        }
    }
    
    startLockoutCountdown() {
        const countdownEl = document.getElementById('lockoutCountdown');
        if (!countdownEl) return;
        
        const interval = setInterval(() => {
            const remaining = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                this.resetLockout();
                location.reload();
            } else {
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;
                countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    resetLockout() {
        this.loginAttempts = 0;
        this.lockoutUntil = 0;
        localStorage.removeItem('adminLockout');
    }
    
    handleLogin(e) {
        e.preventDefault();
        
        // Check if account is locked
        if (this.lockoutUntil > Date.now()) {
            this.showError('Account is locked. Please wait before trying again.');
            return;
        }
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showError('Please enter both username and password.');
            return;
        }
        
        // Verify credentials
        if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
            this.isAuthenticated = true;
            this.loginAttempts = 0;
            this.show2FAForm();
        } else {
            this.loginAttempts++;
            this.showError(`Invalid credentials. ${this.maxLoginAttempts - this.loginAttempts} attempts remaining.`);
            
            // Check if max attempts reached
            if (this.loginAttempts >= this.maxLoginAttempts) {
                this.lockoutUntil = Date.now() + this.lockoutDuration;
                localStorage.setItem('adminLockout', this.lockoutUntil.toString());
                this.showLockoutMessage(Math.ceil(this.lockoutDuration / 1000 / 60));
            }
        }
    }
    
    show2FAForm() {
        const loginContainer = document.getElementById('adminLoginContainer');
        if (loginContainer) {
            loginContainer.innerHTML = `
                <div class="twofa-container">
                    <h2>🔐 Two-Factor Authentication</h2>
                    <p>Please enter the 6-digit code from your authenticator app.</p>
                    
                    <form id="twoFAForm" class="twofa-form">
                        <div class="form-group">
                            <label for="twoFACode">2FA Code:</label>
                            <input type="text" id="twoFACode" name="twoFACode" 
                                   maxlength="6" pattern="[0-9]{6}" 
                                   placeholder="000000" required>
                        </div>
                        
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">Verify 2FA</button>
                            <button type="button" class="btn btn-secondary" onclick="adminAuth.backToLogin()">Back to Login</button>
                        </div>
                    </form>
                    
                    <div class="twofa-help">
                        <h4>📱 How to get your 2FA code:</h4>
                        <ol>
                            <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                            <li>Look for the entry: <strong>OTP Bot Admin</strong></li>
                            <li>Enter the 6-digit code shown</li>
                        </ol>
                        
                        <div class="qr-code-section">
                            <h5>🔑 Setup 2FA (if not already configured):</h5>
                            <p>Secret Key: <code>${this.adminCredentials.secret2FA}</code></p>
                            <p>Or scan this QR code:</p>
                            <div id="qrCode"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Generate QR code
            this.generateQRCode();
            
            // Setup 2FA form listener
            const twoFAForm = document.getElementById('twoFAForm');
            if (twoFAForm) {
                twoFAForm.addEventListener('submit', (e) => this.handle2FA(e));
            }
        }
    }
    
    generateQRCode() {
        const qrContainer = document.getElementById('qrCode');
        if (qrContainer) {
            // Generate TOTP URI
            const totpUri = `otpauth://totp/OTP%20Bot%20Admin?secret=${this.adminCredentials.secret2FA}&issuer=OTP%20Bot`;
            
            // Create QR code using qrcode.js library
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: totpUri,
                    width: 128,
                    height: 128,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                qrContainer.innerHTML = `
                    <p>QR Code library not loaded. Use the secret key above.</p>
                    <p><strong>Secret:</strong> ${this.adminCredentials.secret2FA}</p>
                `;
            }
        }
    }
    
    handle2FA(e) {
        e.preventDefault();
        
        const twoFACode = document.getElementById('twoFACode').value.trim();
        
        if (!twoFACode || twoFACode.length !== 6) {
            this.showError('Please enter a valid 6-digit 2FA code.');
            return;
        }
        
        // Verify 2FA code (using TOTP algorithm)
        if (this.verifyTOTP(twoFACode)) {
            this.is2FAVerified = true;
            this.saveAuthState();
            this.showAdminPanel();
        } else {
            this.showError('Invalid 2FA code. Please try again.');
        }
    }
    
    verifyTOTP(code) {
        // Simple TOTP verification (for demo purposes)
        // In production, use a proper TOTP library
        
        const now = Math.floor(Date.now() / 1000);
        const timeStep = 30; // 30-second time step
        
        // Generate expected codes for current and adjacent time steps
        const expectedCodes = [];
        for (let i = -1; i <= 1; i++) {
            const time = Math.floor((now + i * timeStep) / timeStep);
            const expectedCode = this.generateTOTPCode(time);
            expectedCodes.push(expectedCode);
        }
        
        return expectedCodes.includes(code);
    }
    
    generateTOTPCode(time) {
        // Simple TOTP generation (for demo purposes)
        // In production, use a proper TOTP library like 'otplib'
        
        const secret = this.adminCredentials.secret2FA;
        const timeStr = time.toString();
        
        // Simple hash-like function (NOT for production use)
        let hash = 0;
        for (let i = 0; i < timeStr.length; i++) {
            const char = timeStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Generate 6-digit code
        const code = Math.abs(hash) % 1000000;
        return code.toString().padStart(6, '0');
    }
    
    backToLogin() {
        this.isAuthenticated = false;
        this.is2FAVerified = false;
        location.reload();
    }
    
    saveAuthState() {
        const authData = {
            isAuthenticated: this.isAuthenticated,
            is2FAVerified: this.is2FAVerified,
            timestamp: Date.now()
        };
        localStorage.setItem('adminAuth', JSON.stringify(authData));
    }
    
    showAdminPanel() {
        // Hide login container
        const loginContainer = document.getElementById('adminLoginContainer');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        
        // Show admin panel
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = 'block';
        }
        
        // Update navigation
        this.updateNavigation();
        
        // Load admin dashboard
        this.loadAdminDashboard();
    }
    
    updateNavigation() {
        const nav = document.querySelector('nav');
        if (nav) {
            nav.innerHTML = `
                <div class="nav-brand">🔐 OTP Bot Admin</div>
                <div class="nav-menu">
                    <a href="#" onclick="adminAuth.loadAdminDashboard()">📊 Dashboard</a>
                    <a href="#" onclick="adminAuth.loadUsers()">👥 Users</a>
                    <a href="#" onclick="adminAuth.loadTransactions()">💰 Transactions</a>
                    <a href="#" onclick="adminAuth.loadSettings()">⚙️ Settings</a>
                    <button onclick="adminAuth.logout()" class="btn btn-danger">🚪 Logout</button>
                </div>
            `;
        }
    }
    
    loadAdminDashboard() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="dashboard">
                    <h1>📊 Admin Dashboard</h1>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>👥 Total Users</h3>
                            <p class="stat-number" id="totalUsers">Loading...</p>
                        </div>
                        <div class="stat-card">
                            <h3>💰 Total Balance</h3>
                            <p class="stat-number" id="totalBalance">Loading...</p>
                        </div>
                        <div class="stat-card">
                            <h3>📝 Transactions</h3>
                            <p class="stat-number" id="totalTransactions">Loading...</p>
                        </div>
                        <div class="stat-card">
                            <h3>🚫 Banned Users</h3>
                            <p class="stat-number" id="bannedUsers">Loading...</p>
                        </div>
                    </div>
                    
                    <div class="quick-actions">
                        <h3>⚡ Quick Actions</h3>
                        <div class="action-buttons">
                            <button onclick="adminAuth.loadUsers()" class="btn btn-primary">👥 Manage Users</button>
                            <button onclick="adminAuth.loadTransactions()" class="btn btn-primary">💰 View Transactions</button>
                            <button onclick="adminAuth.loadSettings()" class="btn btn-primary">⚙️ Bot Settings</button>
                            <button onclick="adminAuth.exportData()" class="btn btn-secondary">📊 Export Data</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Load dashboard data
            this.loadDashboardData();
        }
    }
    
    loadDashboardData() {
        // Simulate loading data from API
        setTimeout(() => {
            document.getElementById('totalUsers').textContent = '1,234';
            document.getElementById('totalBalance').textContent = '5,678.90 💎';
            document.getElementById('totalTransactions').textContent = '9,876';
            document.getElementById('bannedUsers').textContent = '12';
        }, 1000);
    }
    
    loadUsers() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="users-management">
                    <h1>👥 Users Management</h1>
                    
                    <div class="search-filters">
                        <input type="text" id="userSearch" placeholder="Search users..." class="search-input">
                        <select id="statusFilter" class="filter-select">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="banned">Banned</option>
                        </select>
                        <button onclick="adminAuth.searchUsers()" class="btn btn-primary">🔍 Search</button>
                    </div>
                    
                    <div class="users-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                <tr><td colspan="6">Loading users...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // Load users data
            this.loadUsersData();
        }
    }
    
    loadUsersData() {
        // Simulate loading users from API
        const users = [
            { id: 1, name: 'John Doe', username: 'johndoe', balance: 150.50, status: 'active' },
            { id: 2, name: 'Jane Smith', username: 'janesmith', balance: 75.25, status: 'active' },
            { id: 3, name: 'Bob Johnson', username: 'bobjohnson', balance: 0.00, status: 'banned' }
        ];
        
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>@${user.username}</td>
                    <td>${user.balance.toFixed(2)} 💎</td>
                    <td><span class="status-${user.status}">${user.status}</span></td>
                    <td>
                        <button onclick="adminAuth.editUser(${user.id})" class="btn btn-small btn-primary">✏️</button>
                        <button onclick="adminAuth.toggleUserStatus(${user.id})" class="btn btn-small btn-${user.status === 'active' ? 'warning' : 'success'}">
                            ${user.status === 'active' ? '🚫' : '✅'}
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    searchUsers() {
        const searchTerm = document.getElementById('userSearch').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        // Implement user search functionality
        console.log('Searching users:', { searchTerm, statusFilter });
    }
    
    editUser(userId) {
        console.log('Editing user:', userId);
        // Implement user editing functionality
    }
    
    toggleUserStatus(userId) {
        console.log('Toggling user status:', userId);
        // Implement user status toggle functionality
    }
    
    loadTransactions() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="transactions">
                    <h1>💰 Transactions</h1>
                    <p>Transaction history will be displayed here.</p>
                </div>
            `;
        }
    }
    
    loadSettings() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="settings">
                    <h1>⚙️ Bot Settings</h1>
                    <p>Bot configuration settings will be displayed here.</p>
                </div>
            `;
        }
    }
    
    exportData() {
        console.log('Exporting data...');
        // Implement data export functionality
    }
    
    logout() {
        this.isAuthenticated = false;
        this.is2FAVerified = false;
        localStorage.removeItem('adminAuth');
        location.reload();
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(err => err.remove());
        
        // Add new error message
        const form = document.querySelector('form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('togglePassword');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '👁️';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '🙈';
        }
    }
}

// Initialize admin authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminAuth = new AdminAuth();
});
