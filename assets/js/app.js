/**
 * Enhanced Application JavaScript
 * Handles client-side error handling, success handling, and utilities
 */

class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupToastSystem();
        this.setupLoadingSystem();
        this.setupFormValidation();
        this.setupModalEnhancements();
    }

    // Enhanced Toast Notification System
    setupToastSystem() {
        this.createToastContainer();
    }

    createToastContainer() {
        if (!document.getElementById('toast-container') && document.body) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const typeClasses = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.className = `${typeClasses[type]} flex items-center p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <span class="text-lg">${icons[type]}</span>
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.remove()">
                <span class="text-lg">×</span>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    // Loading System
    setupLoadingSystem() {
        this.createLoadingSpinner();
    }

    createLoadingSpinner() {
        if (!document.getElementById('loading-spinner') && document.body) {
            const spinner = document.createElement('div');
            spinner.id = 'loading-spinner';
            spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
            spinner.innerHTML = `
                <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="text-gray-700 font-medium">Loading...</span>
                </div>
            `;
            document.body.appendChild(spinner);
        }
    }

    showLoading(show = true) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    }

    // Enhanced Modal System
    setupModalEnhancements() {
        this.setupModalClickOutside();
        this.setupModalEscapeKey();
        this.setupModalAnimations();
    }

    setupModalClickOutside() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modalId = e.target.id;
                if (window.hideModal) {
                    window.hideModal(modalId);
                }
            }
        });
    }

    setupModalEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal && window.hideModal) {
                    window.hideModal(openModal.id);
                }
            }
        });
    }

    setupModalAnimations() {
        // Add smooth animations to modals
        document.addEventListener('DOMContentLoaded', () => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'opacity' && modal.classList.contains('hide')) {
                        modal.style.display = 'none';
                    }
                });
            });
        });
    }

    // Form Validation
    setupFormValidation() {
        document.addEventListener('DOMContentLoaded', () => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                form.addEventListener('submit', (e) => {
                    if (!this.validateForm(form)) {
                        e.preventDefault();
                    }
                });
            });
        });
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(input);
            }
        });

        return isValid;
    }

    showFieldError(input, message) {
        const errorDiv = input.parentNode.querySelector('.field-error') || 
                        document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-sm mt-1';
        errorDiv.textContent = message;
        
        if (!input.parentNode.querySelector('.field-error')) {
            input.parentNode.appendChild(errorDiv);
        }
        
        input.classList.add('border-red-500');
    }

    clearFieldError(input) {
        const errorDiv = input.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.classList.remove('border-red-500');
    }

    // Event Listeners
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupMobileMenu();
            this.setupFormEnhancements();
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.dataset.confirm) {
                if (!confirm(e.target.dataset.confirm)) {
                    e.preventDefault();
                }
            }
        });

        // Handle delete confirmations
        document.addEventListener('click', (e) => {
            if (e.target.dataset.confirm) {
                if (!confirm(e.target.dataset.confirm)) {
                    e.preventDefault();
                }
            }
        });
    }

    setupMobileMenu() {
        const mobileMenuButton = document.querySelector('.mobile-menu-button');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    setupFormEnhancements() {
        // Add focus effects to form inputs
        const inputs = document.querySelectorAll('.form-input, .form-select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentNode.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentNode.classList.remove('focused');
            });
        });
    }

    // Success and Error Handlers
    handleSuccess(message, data = null) {
        this.showToast(message, 'success');
        return data;
    }

    handleError(error, fallbackMessage = 'An error occurred') {
        const message = error?.message || error || fallbackMessage;
        this.showToast(message, 'error');
        console.error('Error:', error);
    }
}

// Enhanced Modal utility functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && document.body) {
        // Remove any existing classes
        modal.classList.remove('hide', 'hidden');
        modal.classList.add('show');
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Focus first input in modal
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Ensure modal is properly positioned
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && document.body) {
        modal.classList.remove('show');
        modal.classList.add('hide');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Hide modal after animation
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
        }, 300);
    }
}

// Enhanced modal click outside functionality
function setupModalClickOutside() {
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            hideModal(modalId);
        }
    });
}

// Enhanced modal escape key functionality
function setupModalEscapeKey() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                hideModal(modal.id);
            });
        }
    });
}

// Initialize modal functionality
document.addEventListener('DOMContentLoaded', function() {
    setupModalClickOutside();
    setupModalEscapeKey();
    
    // Initialize mobile menu
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!window.app) {
        window.app = new App();
    }
});

// Fallback mobile menu initialization (in case App class doesn't load)
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        // Remove any existing event listeners
        const newButton = mobileMenuButton.cloneNode(true);
        mobileMenuButton.parentNode.replaceChild(newButton, mobileMenuButton);
        
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mobileMenu.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!newButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('show');
            }
        });
        
        // Close mobile menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                mobileMenu.classList.remove('show');
            }
        });
    }
});

// Global utility functions
window.showToast = (message, type, duration) => {
    if (window.app && window.app.showToast) {
        window.app.showToast(message, type, duration);
    } else {
        // Fallback toast
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

window.showLoading = (show) => {
    if (window.app && window.app.showLoading) {
        window.app.showLoading(show);
    }
};

window.handleSuccess = (message, data) => {
    if (window.app && window.app.handleSuccess) {
        return window.app.handleSuccess(message, data);
    } else {
        console.log(`[SUCCESS] ${message}`, data);
        return data;
    }
};

window.handleError = (error, fallbackMessage) => {
    if (window.app && window.app.handleError) {
        window.app.handleError(error, fallbackMessage);
    } else {
        console.error(`[ERROR] ${fallbackMessage}`, error);
    }
};

// Enhanced form submission helper
window.submitForm = async (formElement, endpoint, options = {}) => {
    try {
        window.showLoading(true);
        
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        const response = await fetch(endpoint, {
            method: options.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.handleSuccess(options.successMessage || 'Operation completed successfully', result);
            if (options.onSuccess) {
                options.onSuccess(result);
            }
        } else {
            throw new Error(result.message || 'Request failed');
        }
    } catch (error) {
        window.handleError(error, options.errorMessage || 'An error occurred');
        if (options.onError) {
            options.onError(error);
        }
    } finally {
        window.showLoading(false);
    }
};
