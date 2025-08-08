// ઘરખર્ચ ટ્રેકર - Home Expense Tracker JavaScript

class ExpenseTracker {
    constructor() {
        this.expenses = [];
        this.budget = 0;
        this.currentTheme = 'light';
        this.categoryChart = null;
        this.monthlyChart = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.loadTheme();
        this.updateDashboard();
        this.updateExpenseList();
        this.updateBudgetInfo();
        this.updateReports();
        this.setDefaultDate();
    }

    // ડેટા મેનેજમેન્ટ (Data Management)
    loadData() {
        try {
            // Try multiple storage methods for better persistence
            let savedExpenses = localStorage.getItem('expenses');
            let savedBudget = localStorage.getItem('budget');
            
            // If localStorage is empty, try sessionStorage as backup
            if (!savedExpenses) {
                savedExpenses = sessionStorage.getItem('expenses');
            }
            if (!savedBudget) {
                savedBudget = sessionStorage.getItem('budget');
            }
            
            if (savedExpenses) {
                this.expenses = JSON.parse(savedExpenses);
                // Ensure all amounts are numbers
                this.expenses.forEach(expense => {
                    expense.amount = parseFloat(expense.amount) || 0;
                });
            }
            
            if (savedBudget) {
                this.budget = parseFloat(savedBudget) || 0;
            }
            
            // Also try to load from IndexedDB if available
            this.loadFromIndexedDB();
        } catch (error) {
            console.error('Error loading data:', error);
            this.expenses = [];
            this.budget = 0;
        }
    }

    saveData() {
        try {
            // Save to localStorage
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            localStorage.setItem('budget', this.budget.toString());
            
            // Also save to sessionStorage as backup
            sessionStorage.setItem('expenses', JSON.stringify(this.expenses));
            sessionStorage.setItem('budget', this.budget.toString());
            
            // Save to IndexedDB for better persistence
            this.saveToIndexedDB();
            
            // Create backup file automatically
            this.createBackupFile();
            
        } catch (error) {
            console.error('Error saving data:', error);
            this.showNotification('ડેટા સેવ કરવામાં ભૂલ!', 'error');
        }
    }

    // IndexedDB for better data persistence
    async saveToIndexedDB() {
        try {
            if ('indexedDB' in window) {
                const db = await this.openDB();
                const transaction = db.transaction(['expenses'], 'readwrite');
                const store = transaction.objectStore('expenses');
                
                // Clear existing data
                await store.clear();
                
                // Save expenses
                for (let expense of this.expenses) {
                    await store.add(expense);
                }
                
                // Save budget
                await store.put({ id: 'budget', value: this.budget });
            }
        } catch (error) {
            console.error('IndexedDB save error:', error);
        }
    }

    async loadFromIndexedDB() {
        try {
            if ('indexedDB' in window) {
                const db = await this.openDB();
                const transaction = db.transaction(['expenses'], 'readonly');
                const store = transaction.objectStore('expenses');
                
                // Load expenses
                const expenses = await store.getAll();
                const budgetData = await store.get('budget');
                
                if (expenses.length > 0 && this.expenses.length === 0) {
                    this.expenses = expenses.filter(exp => exp.id !== 'budget');
                }
                
                if (budgetData && this.budget === 0) {
                    this.budget = budgetData.value || 0;
                }
            }
        } catch (error) {
            console.error('IndexedDB load error:', error);
        }
    }

    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ExpenseTrackerDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('expenses')) {
                    db.createObjectStore('expenses', { keyPath: 'id' });
                }
            };
        });
    }

    // Create backup file
    createBackupFile() {
        try {
            const backupData = {
                expenses: this.expenses,
                budget: this.budget,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                type: 'application/json'
            });
            
            // Store backup in localStorage as base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                localStorage.setItem('expense_backup', base64);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Backup creation error:', error);
        }
    }

    // Load from backup
    loadFromBackup() {
        try {
            const backupData = localStorage.getItem('expense_backup');
            if (backupData) {
                const jsonData = atob(backupData);
                const data = JSON.parse(jsonData);
                
                if (data.expenses) {
                    this.expenses = data.expenses;
                }
                if (data.budget) {
                    this.budget = data.budget;
                }
                
                this.saveData();
                this.showNotification('બેકઅપથી ડેટા લોડ થયો!', 'success');
            }
        } catch (error) {
            console.error('Backup load error:', error);
        }
    }

    // થીમ મેનેજમેન્ટ (Theme Management)
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            const icon = themeBtn.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'fas fa-sun';
                } else {
                    icon.className = 'fas fa-moon';
                }
            }
        }
    }

    // ઇવેન્ટ લિસનર્સ (Event Listeners)
    setupEventListeners() {
        // નેવિગેશન (Navigation)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(item.dataset.section);
            });
        });

        // થીમ ટૉગલ (Theme Toggle)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
            });
        }

        // ખર્ચ ફોર્મ (Expense Form)
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExpense();
            });
        }

        // બજેટ ફોર્મ (Budget Form)
        const budgetForm = document.getElementById('budget-form');
        if (budgetForm) {
            budgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.setBudget();
            });
        }

        // ફિલ્ટર્સ (Filters)
        const searchExpense = document.getElementById('search-expense');
        if (searchExpense) {
            searchExpense.addEventListener('input', () => {
                this.filterExpenses();
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterExpenses();
            });
        }

        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filterExpenses();
            });
        }

        // CSV એક્સપોર્ટ (CSV Export)
        const exportCsv = document.getElementById('export-csv');
        if (exportCsv) {
            exportCsv.addEventListener('click', () => {
                this.exportToCSV();
            });
        }

        // બેકઅપ ફીચર્સ (Backup Features)
        const exportData = document.getElementById('export-data');
        if (exportData) {
            exportData.addEventListener('click', () => {
                this.exportData();
            });
        }

        const importData = document.getElementById('import-data');
        if (importData) {
            importData.addEventListener('click', () => {
                document.getElementById('import-file').click();
            });
        }

        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importData(e.target.files[0]);
            });
        }

        const restoreBackup = document.getElementById('restore-backup');
        if (restoreBackup) {
            restoreBackup.addEventListener('click', () => {
                this.loadFromBackup();
            });
        }

        const clearData = document.getElementById('clear-data');
        if (clearData) {
            clearData.addEventListener('click', () => {
                this.clearAllData();
            });
        }

        // મોડલ (Modal)
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // મોડલ બેકડ્રોપ ક્લિક (Modal Backdrop Click)
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target.id === 'edit-modal') {
                    this.closeModal();
                }
            });
        }
    }

    // સેક્શન દેખાડવા (Show Section)
    showSection(sectionId) {
        // બધા સેક્શન્સ છુપાડો (Hide all sections)
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // સક્ટિવ નેવ આઇટમ છુપાડો (Hide active nav item)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // સેક્શન અને નેવ આઇટમ સક્ટિવ કરો (Activate section and nav item)
        const targetSection = document.getElementById(sectionId);
        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        if (targetNav) {
            targetNav.classList.add('active');
        }

        // ચાર્ટ્સ અપડેટ કરો (Update charts if on dashboard)
        if (sectionId === 'dashboard') {
            this.updateCharts();
        }
    }

    // ખર્ચ ઉમેરવા (Add Expense)
    addExpense() {
        const form = document.getElementById('expense-form');
        if (!form) return;

        const formData = new FormData(form);
        
        // Validate required fields
        const date = formData.get('expense-date');
        const category = formData.get('expense-category');
        const amountStr = formData.get('expense-amount');
        const description = formData.get('expense-description') || '';

        if (!date || !category || !amountStr) {
            this.showNotification('કૃપા કરીને બધા જરૂરી ફીલ્ડ્સ ભરો!', 'error');
            return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('કૃપા કરીને માન્ય રકમ દાખલ કરો!', 'error');
            return;
        }

        const expense = {
            id: Date.now(),
            date: date,
            category: category,
            amount: amount,
            description: description
        };

        this.expenses.push(expense);
        this.saveData();
        
        // UI અપડેટ (Update UI)
        this.updateDashboard();
        this.updateExpenseList();
        this.updateBudgetInfo();
        this.updateReports();
        
        // ફોર્મ રીસેટ (Reset form)
        form.reset();
        this.setDefaultDate();
        
        this.showNotification('ખર્ચ સફળતાપૂર્વક ઉમેરાયો!', 'success');
    }

    // બજેટ સેટ કરવા (Set Budget)
    setBudget() {
        const form = document.getElementById('budget-form');
        if (!form) return;

        const formData = new FormData(form);
        const budgetStr = formData.get('monthly-budget');
        
        if (!budgetStr) {
            this.showNotification('કૃપા કરીને બજેટ દાખલ કરો!', 'error');
            return;
        }

        const budget = parseFloat(budgetStr);
        if (isNaN(budget) || budget <= 0) {
            this.showNotification('કૃપા કરીને માન્ય બજેટ દાખલ કરો!', 'error');
            return;
        }

        this.budget = budget;
        this.saveData();
        this.updateBudgetInfo();
        this.updateDashboard();
        form.reset();
        this.showNotification('બજેટ સફળતાપૂર્વક સેટ થયો!', 'success');
    }

    // ખર્ચ સંપાદિત કરવા (Edit Expense)
    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        // મોડલ ફોર્મ ભરો (Fill modal form)
        const editDate = document.getElementById('edit-date');
        const editCategory = document.getElementById('edit-category');
        const editAmount = document.getElementById('edit-amount');
        const editDescription = document.getElementById('edit-description');

        if (editDate) editDate.value = expense.date;
        if (editCategory) editCategory.value = expense.category;
        if (editAmount) editAmount.value = expense.amount;
        if (editDescription) editDescription.value = expense.description;

        // મોડલ ખોલો (Open modal)
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
            editModal.classList.add('active');
        }

        // સેવ બટન પર ઇવેન્ટ (Event on save button)
        const editForm = document.getElementById('edit-expense-form');
        if (editForm) {
            editForm.onsubmit = (e) => {
                e.preventDefault();
                this.saveEditedExpense(id);
            };
        }
    }

    // સંપાદિત ખર્ચ સેવ કરવા (Save Edited Expense)
    saveEditedExpense(id) {
        const form = document.getElementById('edit-expense-form');
        if (!form) return;

        const formData = new FormData(form);
        
        // Validate required fields
        const date = formData.get('edit-date');
        const category = formData.get('edit-category');
        const amountStr = formData.get('edit-amount');
        const description = formData.get('edit-description') || '';

        if (!date || !category || !amountStr) {
            this.showNotification('કૃપા કરીને બધા જરૂરી ફીલ્ડ્સ ભરો!', 'error');
            return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('કૃપા કરીને માન્ય રકમ દાખલ કરો!', 'error');
            return;
        }

        const expenseIndex = this.expenses.findIndex(exp => exp.id === id);
        if (expenseIndex === -1) return;

        this.expenses[expenseIndex] = {
            id: id,
            date: date,
            category: category,
            amount: amount,
            description: description
        };

        this.saveData();
        this.updateDashboard();
        this.updateExpenseList();
        this.updateBudgetInfo();
        this.updateReports();
        
        this.closeModal();
        this.showNotification('ખર્ચ સફળતાપૂર્વક અપડેટ થયો!', 'success');
    }

    // ખર્ચ કાઢી નાખવા (Delete Expense)
    deleteExpense(id) {
        if (confirm('શું તમે આ ખર્ચ કાઢી નાખવા માંગો છો?')) {
            this.expenses = this.expenses.filter(exp => exp.id !== id);
            this.saveData();
            this.updateDashboard();
            this.updateExpenseList();
            this.updateBudgetInfo();
            this.updateReports();
            this.showNotification('ખર્ચ કાઢી નાખાયો!', 'success');
        }
    }

    // ખર્ચ ફિલ્ટર કરવા (Filter Expenses)
    filterExpenses() {
        const searchTerm = document.getElementById('search-expense')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const dateFilter = document.getElementById('date-filter')?.value || '';

        let filteredExpenses = this.expenses;

        // શોધ ફિલ્ટર (Search filter)
        if (searchTerm) {
            filteredExpenses = filteredExpenses.filter(exp => 
                exp.description.toLowerCase().includes(searchTerm)
            );
        }

        // શ્રેણી ફિલ્ટર (Category filter)
        if (categoryFilter) {
            filteredExpenses = filteredExpenses.filter(exp => 
                exp.category === categoryFilter
            );
        }

        // તારીખ ફિલ્ટર (Date filter)
        if (dateFilter) {
            filteredExpenses = filteredExpenses.filter(exp => 
                exp.date === dateFilter
            );
        }

        this.updateExpenseList(filteredExpenses);
    }

    // ડેશબોર્ડ અપડેટ કરવા (Update Dashboard)
    updateDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const todayExpenses = this.expenses.filter(exp => exp.date === today);
        const todayTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // આ સપ્તાહનો ખર્ચ (This week's expenses)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= weekStart && expDate <= weekEnd;
        });
        const weekTotal = weekExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // આ મહિનાનો ખર્ચ (This month's expenses)
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        
        const monthExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= monthStart && expDate <= monthEnd;
        });
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // કુલ ખર્ચ (Total expenses)
        const totalExpenses = this.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // કાર્ડ્સ અપડેટ કરો (Update cards)
        const todayExpenseEl = document.getElementById('today-expense');
        const weekExpenseEl = document.getElementById('week-expense');
        const monthExpenseEl = document.getElementById('month-expense');
        const totalExpenseEl = document.getElementById('total-expense');

        if (todayExpenseEl) todayExpenseEl.textContent = `₹${todayTotal.toFixed(2)}`;
        if (weekExpenseEl) weekExpenseEl.textContent = `₹${weekTotal.toFixed(2)}`;
        if (monthExpenseEl) monthExpenseEl.textContent = `₹${monthTotal.toFixed(2)}`;
        if (totalExpenseEl) totalExpenseEl.textContent = `₹${totalExpenses.toFixed(2)}`;

        // બજેટ ચેતવણી (Budget warning)
        this.checkBudgetWarning(monthTotal);
    }

    // બજેટ ચેતવણી ચેક કરવા (Check Budget Warning)
    checkBudgetWarning(monthTotal) {
        const warningElement = document.getElementById('budget-warning');
        if (!warningElement) return;
        
        if (this.budget > 0 && monthTotal > this.budget) {
            warningElement.classList.remove('hidden');
        } else {
            warningElement.classList.add('hidden');
        }
    }

    // ખર્ચ યાદી અપડેટ કરવા (Update Expense List)
    updateExpenseList(expenses = null) {
        const tbody = document.getElementById('expense-tbody');
        if (!tbody) return;

        const dataToShow = expenses || this.expenses;
        
        tbody.innerHTML = '';

        if (dataToShow.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">કોઈ ખર્ચ મળ્યો નથી</td>
                </tr>
            `;
            return;
        }

        // તારીખ મુજબ સૉર્ટ કરો (Sort by date)
        const sortedExpenses = dataToShow.sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatDate(expense.date)}</td>
                <td>${expense.category}</td>
                <td>₹${(expense.amount || 0).toFixed(2)}</td>
                <td>${expense.description || '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="expenseTracker.editExpense(${expense.id})">
                            <i class="fas fa-edit"></i> સંપાદિત
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="expenseTracker.deleteExpense(${expense.id})">
                            <i class="fas fa-trash"></i> કાઢી નાખો
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // બજેટ માહિતી અપડેટ કરવા (Update Budget Info)
    updateBudgetInfo() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthExpenses = this.expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });
        
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const remainingBudget = Math.max(0, this.budget - monthTotal);
        const budgetUsage = this.budget > 0 ? (monthTotal / this.budget) * 100 : 0;

        const currentBudgetEl = document.getElementById('current-budget');
        const remainingBudgetEl = document.getElementById('remaining-budget');
        const budgetProgressEl = document.getElementById('budget-progress');
        const budgetPercentageEl = document.getElementById('budget-percentage');

        if (currentBudgetEl) currentBudgetEl.textContent = `₹${this.budget.toFixed(2)}`;
        if (remainingBudgetEl) remainingBudgetEl.textContent = `₹${remainingBudget.toFixed(2)}`;
        if (budgetProgressEl) budgetProgressEl.style.width = `${Math.min(budgetUsage, 100)}%`;
        if (budgetPercentageEl) budgetPercentageEl.textContent = `${budgetUsage.toFixed(1)}%`;
    }

    // રિપોર્ટ્સ અપડેટ કરવા (Update Reports)
    updateReports() {
        this.updateCategorySummary();
        this.updateMonthlyComparison();
    }

    // શ્રેણી સારાંશ અપડેટ કરવા (Update Category Summary)
    updateCategorySummary() {
        const categorySummary = {};
        
        this.expenses.forEach(expense => {
            const amount = expense.amount || 0;
            if (categorySummary[expense.category]) {
                categorySummary[expense.category] += amount;
            } else {
                categorySummary[expense.category] = amount;
            }
        });

        const summaryContainer = document.getElementById('category-summary');
        if (!summaryContainer) return;

        summaryContainer.innerHTML = '';

        Object.entries(categorySummary)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, amount]) => {
                const item = document.createElement('div');
                item.className = 'summary-item';
                item.innerHTML = `
                    <span>${category}</span>
                    <span>₹${amount.toFixed(2)}</span>
                `;
                summaryContainer.appendChild(item);
            });
    }

    // માસિક તુલના અપડેટ કરવા (Update Monthly Comparison)
    updateMonthlyComparison() {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        this.expenses.forEach(expense => {
            const expDate = new Date(expense.date);
            if (expDate.getFullYear() === currentYear) {
                const month = expDate.getMonth();
                const monthName = this.getMonthName(month);
                const amount = expense.amount || 0;
                
                if (monthlyData[monthName]) {
                    monthlyData[monthName] += amount;
                } else {
                    monthlyData[monthName] = amount;
                }
            }
        });

        const comparisonContainer = document.getElementById('monthly-comparison');
        if (!comparisonContainer) return;

        comparisonContainer.innerHTML = '';

        Object.entries(monthlyData)
            .sort(([a], [b]) => this.getMonthIndex(a) - this.getMonthIndex(b))
            .forEach(([month, amount]) => {
                const item = document.createElement('div');
                item.className = 'comparison-item';
                item.innerHTML = `
                    <span>${month}</span>
                    <span>₹${amount.toFixed(2)}</span>
                `;
                comparisonContainer.appendChild(item);
            });
    }

    // ચાર્ટ્સ અપડેટ કરવા (Update Charts)
    updateCharts() {
        this.updateCategoryChart();
        this.updateMonthlyChart();
    }

    // શ્રેણી ચાર્ટ અપડેટ કરવા (Update Category Chart)
    updateCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const categoryData = {};
        this.expenses.forEach(expense => {
            const amount = expense.amount || 0;
            if (categoryData[expense.category]) {
                categoryData[expense.category] += amount;
            } else {
                categoryData[expense.category] = amount;
            }
        });

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        if (Object.keys(categoryData).length === 0) return;

        this.categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
                        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // માસિક ચાર્ટ અપડેટ કરવા (Update Monthly Chart)
    updateMonthlyChart() {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        this.expenses.forEach(expense => {
            const expDate = new Date(exp.date);
            if (expDate.getFullYear() === currentYear) {
                const month = expDate.getMonth();
                const monthName = this.getMonthName(month);
                const amount = expense.amount || 0;
                
                if (monthlyData[monthName]) {
                    monthlyData[monthName] += amount;
                } else {
                    monthlyData[monthName] = amount;
                }
            }
        });

        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        if (Object.keys(monthlyData).length === 0) return;

        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyData),
                datasets: [{
                    label: 'માસિક ખર્ચ',
                    data: Object.values(monthlyData),
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // CSV એક્સપોર્ટ કરવા (Export to CSV)
    exportToCSV() {
        if (this.expenses.length === 0) {
            this.showNotification('કોઈ ખર્ચ નથી એક્સપોર્ટ કરવા માટે!', 'error');
            return;
        }

        const headers = ['તારીખ', 'શ્રેણી', 'રકમ', 'વર્ણન'];
        const csvContent = [
            headers.join(','),
            ...this.expenses.map(exp => [
                exp.date,
                exp.category,
                exp.amount || 0,
                exp.description || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('CSV ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ!', 'success');
    }

    // ડેટા એક્સપોર્ટ કરવા (Export Data)
    exportData() {
        const data = {
            expenses: this.expenses,
            budget: this.budget,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('ડેટા સફળતાપૂર્વક એક્સપોર્ટ થયો!', 'success');
    }

    // ડેટા ઇમ્પોર્ટ કરવા (Import Data)
    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.expenses && Array.isArray(data.expenses)) {
                    this.expenses = data.expenses;
                }
                
                if (data.budget) {
                    this.budget = parseFloat(data.budget);
                }
                
                this.saveData();
                this.updateDashboard();
                this.updateExpenseList();
                this.updateBudgetInfo();
                this.updateReports();
                
                this.showNotification('ડેટા સફળતાપૂર્વક ઇમ્પોર્ટ થયો!', 'success');
            } catch (error) {
                this.showNotification('ફાઇલ ફોર્મેટ ખોટો છે!', 'error');
            }
        };
        reader.readAsText(file);
    }

    // બધો ડેટા કાઢી નાખવા (Clear All Data)
    clearAllData() {
        if (confirm('શું તમે બધો ડેટા કાઢી નાખવા માંગો છો? આ ક્રિયા પાછી લાવી શકાતી નથી!')) {
            this.expenses = [];
            this.budget = 0;
            
            // Clear from all storage methods
            localStorage.removeItem('expenses');
            localStorage.removeItem('budget');
            localStorage.removeItem('expense_backup');
            sessionStorage.removeItem('expenses');
            sessionStorage.removeItem('budget');
            
            // Clear IndexedDB
            this.clearIndexedDB();
            
            this.updateDashboard();
            this.updateExpenseList();
            this.updateBudgetInfo();
            this.updateReports();
            
            this.showNotification('બધો ડેટા કાઢી નાખાયો!', 'success');
        }
    }

    // IndexedDB ક્લિયર કરવા (Clear IndexedDB)
    async clearIndexedDB() {
        try {
            if ('indexedDB' in window) {
                const db = await this.openDB();
                const transaction = db.transaction(['expenses'], 'readwrite');
                const store = transaction.objectStore('expenses');
                await store.clear();
            }
        } catch (error) {
            console.error('IndexedDB clear error:', error);
        }
    }

    // મોડલ બંધ કરવા (Close Modal)
    closeModal() {
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
            editModal.classList.remove('active');
        }
    }

    // નોટિફિકેશન બતાવવા (Show Notification)
    showNotification(message, type = 'success') {
        // સરળ નોટિફિકેશન બતાવવા માટે alert વાપરો
        alert(message);
    }

    // તારીખ ફોર્મેટ કરવા (Format Date)
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('gu-IN');
        } catch (error) {
            return dateString;
        }
    }

    // મહિનાનું નામ મેળવવા (Get Month Name)
    getMonthName(monthIndex) {
        const months = [
            'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ',
            'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ',
            'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
        ];
        return months[monthIndex] || 'અજ્ઞાત';
    }

    // મહિનાનો ઇન્ડેક્સ મેળવવા (Get Month Index)
    getMonthIndex(monthName) {
        const months = [
            'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ',
            'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ',
            'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
        ];
        return months.indexOf(monthName);
    }

    // ડિફૉલ્ટ તારીખ સેટ કરવા (Set Default Date)
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const expenseDate = document.getElementById('expense-date');
        if (expenseDate) {
            expenseDate.value = today;
        }
    }
}

// એપ્લિકેશન શરૂ કરવા (Initialize Application)
document.addEventListener('DOMContentLoaded', () => {
    window.expenseTracker = new ExpenseTracker();
});


