let customers = [];
let sales = [];
let settings = {
    defaultMessage: 'مرحباً {name}، شكراً لاختيارك DataBuddy!'
};
let editingCustomerId = null;
let statusChart, salesChart;
let isAssistantTyping = false;

function init() {
    loadData();
    updateDashboard();
    renderCustomers();
    renderSales();
    initCharts();
    document.getElementById('defaultMessage').value = settings.defaultMessage;
    document.getElementById('saleDate').valueAsDate = new Date();
    
    setTimeout(updateAIInsights, 1000);

    addAdvancedAnalysisButton();
}
function resetActivation() {
    window.location.href = "About.html";
}
function loadData() {
    const savedCustomers = localStorage.getItem('databuddy_customers');
    const savedSales = localStorage.getItem('databuddy_sales');
    const savedSettings = localStorage.getItem('databuddy_settings');
    
    if (savedCustomers) customers = JSON.parse(savedCustomers);
    if (savedSales) sales = JSON.parse(savedSales);
    if (savedSettings) settings = JSON.parse(savedSettings);
}

function saveData() {
    localStorage.setItem('databuddy_customers', JSON.stringify(customers));
    localStorage.setItem('databuddy_sales', JSON.stringify(sales));
    localStorage.setItem('databuddy_settings', JSON.stringify(settings));
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'dashboard') {
        updateDashboard();
        updateCharts();
    } else if (tabName === 'sales') {
        renderSales();
    } else if (tabName === 'assistant') {
        updateAIInsights();
    }
}

function updateDashboard() {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = total - active;
    const totalSalesAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);

    document.getElementById('totalCustomers').textContent = total;
    document.getElementById('activeCustomers').textContent = active;
    document.getElementById('inactiveCustomers').textContent = inactive;
    document.getElementById('totalSales').textContent = totalSalesAmount.toFixed(2) + ' دينار';
}

function initCharts() {
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['نشط', 'غير نشط'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#00087aff', '#ff0000ff'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    const salesCtx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'المبيعات (دينار)',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    updateCharts();
}

function updateCharts() {
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.length - active;
    
    statusChart.data.datasets[0].data = [active, inactive];
    statusChart.update();

    const last7Days = [];
    const salesByDay = {};
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        salesByDay[dateStr] = 0;
    }

    sales.forEach(sale => {
        if (salesByDay.hasOwnProperty(sale.date)) {
            salesByDay[sale.date] += parseFloat(sale.amount);
        }
    });

    salesChart.data.labels = last7Days.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
    });
    salesChart.data.datasets[0].data = last7Days.map(d => salesByDay[d]);
    salesChart.update();
}

function getCustomerPurchases(customerId) {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const totalAmount = customerSales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
    
    return {
        sales: customerSales,
        count: customerSales.length,
        total: totalAmount
    };
}