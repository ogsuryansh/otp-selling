/**
 * Admin Panel Bot Integration
 * Handles communication between admin panel and bot webhooks
 */

class BotIntegration {
    constructor() {
        this.config = window.ADMIN_CONFIG || {};
        this.adminId = this.config.credentials?.admin_id || '7574316340';
        this.baseUrl = this.config.bot?.baseUrl || 'http://localhost:5001';
        this.endpoints = this.config.bot?.endpoints || {};
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Test connection on load
        this.testConnection();
    }
    
    /**
     * Initialize all event listeners for admin panel buttons
     */
    initializeEventListeners() {
        // Dashboard stats refresh
        this.setupDashboardStats();
        
        // Quick action buttons
        this.setupQuickActions();
        
        // User management
        this.setupUserManagement();
        
        // Transaction management
        this.setupTransactionManagement();
        
        // Broadcast functionality
        this.setupBroadcast();
    }
    
    /**
     * Setup dashboard statistics
     */
    setupDashboardStats() {
        // Refresh stats button
        const refreshStatsBtn = document.getElementById('refreshStats');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.loadDashboardStats());
        }
        
        // Load stats on View Stats action card click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-card') && e.target.textContent.includes('View Stats')) {
                this.loadDashboardStats();
            }
        });
        
        // Initial load
        this.loadDashboardStats();
    }
    
    /**
     * Setup quick action buttons
     */
    setupQuickActions() {
        // Add Balance Modal
        this.setupModal('addBalance', 'addBalanceForm', (formData) => {
            return this.addBalance(formData.user_id, formData.amount);
        });
        
        // Cut Balance Modal
        this.setupModal('cutBalance', 'cutBalanceForm', (formData) => {
            return this.cutBalance(formData.user_id, formData.amount);
        });
        
        // Ban User Modal
        this.setupModal('banUser', 'banUserForm', (formData) => {
            return this.banUser(formData.user_id, formData.reason);
        });
        
        // Unban User Modal
        this.setupModal('unbanUser', 'unbanUserForm', (formData) => {
            return this.unbanUser(formData.user_id);
        });
    }
    
    /**
     * Setup user management
     */
    setupUserManagement() {
        // User search
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }
        
        // User status filter
        const userStatusFilter = document.getElementById('userStatusFilter');
        if (userStatusFilter) {
            userStatusFilter.addEventListener('change', (e) => {
                this.filterUsers(e.target.value);
            });
        }
        
        // Load users on Manage Users action card click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-card') && e.target.textContent.includes('Manage Users')) {
                this.loadUsers();
            }
        });
    }
    
    /**
     * Setup transaction management
     */
    setupTransactionManagement() {
        // Transaction filter
        const transactionFilter = document.getElementById('transactionFilter');
        if (transactionFilter) {
            transactionFilter.addEventListener('change', (e) => {
                this.filterTransactions(e.target.value);
            });
        }
        
        // Refresh transactions
        const refreshTransactionsBtn = document.getElementById('refreshTransactions');
        if (refreshTransactionsBtn) {
            refreshTransactionsBtn.addEventListener('click', () => this.loadTransactions());
        }
        
        // Load transactions on View Stats action card click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-card') && e.target.textContent.includes('View Stats')) {
                this.loadTransactions();
            }
        });
    }
    
    /**
     * Setup broadcast functionality
     */
    setupBroadcast() {
        const broadcastForm = document.getElementById('broadcastForm');
        if (broadcastForm) {
            broadcastForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = document.getElementById('broadcastMessage').value;
                if (message) {
                    this.broadcastMessage(message);
                }
            });
        }
    }
    
    /**
     * Setup modal with form handling
     */
    setupModal(modalId, formId, submitHandler) {
        const modal = document.getElementById(modalId);
        const form = document.getElementById(formId);
        
        if (modal && form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => data[key] = value);
                
                try {
                    const result = await submitHandler(data);
                    if (result.success) {
                        this.showNotification(result.message, 'success');
                        form.reset();
                        this.closeModal(modalId);
                        
                        // Refresh relevant data
                        this.refreshDataAfterAction();
                    } else {
                        this.showNotification(result.message, 'error');
                    }
                } catch (error) {
                    this.showNotification('An error occurred: ' + error.message, 'error');
                }
            });
        }
    }
    
    /**
     * Test connection to bot webhook
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.health}`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Bot webhook connection successful:', data);
                this.showNotification('Bot connected successfully', 'success');
            } else {
                console.warn('⚠️ Bot webhook connection failed:', response.status);
                this.showNotification('Bot connection failed', 'warning');
            }
        } catch (error) {
            console.error('❌ Bot webhook connection error:', error);
            this.showNotification('Bot connection error', 'error');
        }
    }
    
    /**
     * Load dashboard statistics from bot
     */
    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.getStats}?admin_id=${this.adminId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateDashboardStats(data.data);
                } else {
                    console.error('Failed to load stats:', data.message);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }
    
    /**
     * Update dashboard statistics display
     */
    updateDashboardStats(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            totalTransactions: document.getElementById('totalTransactions'),
            totalBalance: document.getElementById('totalBalance')
        };
        
        if (elements.totalUsers) elements.totalUsers.textContent = stats.total_users || 0;
        if (elements.activeUsers) elements.activeUsers.textContent = stats.active_users || 0;
        if (elements.totalTransactions) elements.totalTransactions.textContent = stats.total_transactions || 0;
        if (elements.totalBalance) elements.totalBalance.textContent = (stats.total_balance || 0).toFixed(2);
    }
    
    /**
     * Load users from bot
     */
    async loadUsers(page = 1, limit = 20) {
        try {
            const response = await fetch(
                `${this.baseUrl}${this.endpoints.getUsers}?admin_id=${this.adminId}&page=${page}&limit=${limit}`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateUsersTable(data.data.users, data.data.pagination);
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    /**
     * Load transactions from bot
     */
    async loadTransactions(page = 1, limit = 20) {
        try {
            const response = await fetch(
                `${this.baseUrl}${this.endpoints.getTransactions}?admin_id=${this.adminId}&page=${page}&limit=${limit}`
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateTransactionsTable(data.data.transactions, data.data.pagination);
                }
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }
    
    /**
     * Add balance to user
     */
    async addBalance(userId, amount) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.addBalance}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    amount: amount,
                    admin_id: this.adminId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error adding balance:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Cut balance from user
     */
    async cutBalance(userId, amount) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.cutBalance}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    amount: amount,
                    admin_id: this.adminId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error cutting balance:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Ban user
     */
    async banUser(userId, reason) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.banUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    reason: reason,
                    admin_id: this.adminId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error banning user:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Unban user
     */
    async unbanUser(userId) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.unbanUser}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    admin_id: this.adminId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error unbanning user:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Broadcast message to all users
     */
    async broadcastMessage(message) {
        try {
            const response = await fetch(`${this.baseUrl}${this.endpoints.broadcast}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    admin_id: this.adminId
                })
            });
            
            const result = await response.json();
            if (result.success) {
                this.showNotification(`Broadcast queued for ${result.user_count} users`, 'success');
            } else {
                this.showNotification(result.message, 'error');
            }
            
            return result;
        } catch (error) {
            console.error('Error broadcasting message:', error);
            this.showNotification('Error broadcasting message: ' + error.message, 'error');
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Update users table
     */
    updateUsersTable(users, pagination) {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'border-b border-white/20';
            
            row.innerHTML = `
                <td class="p-3 text-white">${user.user_id}</td>
                <td class="p-3 text-white">${user.first_name || 'N/A'}</td>
                <td class="p-3 text-white">${user.username || 'N/A'}</td>
                <td class="p-3 text-white">${(user.balance || 0).toFixed(2)} 💎</td>
                <td class="p-3 text-white">
                    <span class="px-2 py-1 rounded text-xs ${user.is_banned ? 'bg-red-500' : 'bg-green-500'}">
                        ${user.is_banned ? 'Banned' : 'Active'}
                    </span>
                </td>
                <td class="p-3 text-white">${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="p-3 text-white">
                    <button onclick="botIntegration.banUser('${user.user_id}', 'Admin action')" 
                            class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                        Ban
                    </button>
                    <button onclick="botIntegration.unbanUser('${user.user_id}')" 
                            class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                        Unban
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update pagination
        this.updatePagination('users', pagination);
    }
    
    /**
     * Update transactions table
     */
    updateTransactionsTable(transactions, pagination) {
        const tbody = document.getElementById('transactionTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.className = 'border-b border-white/20';
            
            row.innerHTML = `
                <td class="p-3 text-white">${transaction.type}</td>
                <td class="p-3 text-white">${transaction.amount} 💎</td>
                <td class="p-3 text-white">${transaction.user_id}</td>
                <td class="p-3 text-white">${new Date(transaction.timestamp).toLocaleDateString()}</td>
                <td class="p-3 text-white">${transaction.description}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update pagination
        this.updatePagination('transactions', pagination);
    }
    
    /**
     * Update pagination controls
     */
    updatePagination(type, pagination) {
        const paginationContainer = document.getElementById(`${type}Pagination`);
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        if (pagination.pages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Previous';
            prevBtn.className = 'px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30';
            prevBtn.disabled = pagination.page <= 1;
            prevBtn.onclick = () => this.loadPage(type, pagination.page - 1);
            
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next →';
            nextBtn.className = 'px-3 py-1 bg-white/20 text-white rounded hover:bg-white/30';
            nextBtn.disabled = pagination.page >= pagination.pages;
            nextBtn.onclick = () => this.loadPage(type, pagination.page + 1);
            
            const pageInfo = document.createElement('span');
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages}`;
            pageInfo.className = 'text-white mx-4';
            
            paginationContainer.appendChild(prevBtn);
            paginationContainer.appendChild(pageInfo);
            paginationContainer.appendChild(nextBtn);
        }
    }
    
    /**
     * Load specific page
     */
    loadPage(type, page) {
        if (type === 'users') {
            this.loadUsers(page);
        } else if (type === 'transactions') {
            this.loadTransactions(page);
        }
    }
    
    /**
     * Search users
     */
    searchUsers(query) {
        // Implement user search functionality
        console.log('Searching users for:', query);
    }
    
    /**
     * Filter users
     */
    filterUsers(status) {
        // Implement user filtering functionality
        console.log('Filtering users by status:', status);
    }
    
    /**
     * Filter transactions
     */
    filterTransactions(filter) {
        // Implement transaction filtering functionality
        console.log('Filtering transactions by:', filter);
    }
    
    /**
     * Refresh data after admin action
     */
    refreshDataAfterAction() {
        // Refresh dashboard stats
        this.loadDashboardStats();
        
        // Refresh users if on users tab
        const usersTab = document.getElementById('users');
        if (usersTab && usersTab.classList.contains('active')) {
            this.loadUsers();
        }
        
        // Refresh transactions if on dashboard tab
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab && dashboardTab.classList.contains('active')) {
            this.loadTransactions();
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize bot integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.botIntegration = new BotIntegration();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotIntegration;
}
