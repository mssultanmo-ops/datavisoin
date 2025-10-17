// server.js - Data Vision CRM - نموذج ناجح
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 10000;

// 🔗 رابط الداتابيس - ضع رابطك من Neon هنا
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'psql 'postgresql://neondb_owner:npg_d6upvPVo4wAQ@ep-raspy-lab-agajrhmu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'',
    ssl: { rejectUnauthorized: false }
});

// 🔑 مفتاح التوقيع
const JWT_SECRET = process.env.JWT_SECRET || 'datavision-secret-key-2024';

// 🔧 دالة تهيئة قاعدة البيانات
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // إنشاء جدول المستخدمين
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        // إنشاء جدول العملاء
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                status TEXT DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // إنشاء جدول المبيعات
        await client.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                sale_date DATE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // إنشاء indexes للأداء
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
            CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
            CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
        `);

        client.release();
        console.log('✅ تم تهيئة قاعدة البيانات بنجاح');
    } catch (error) {
        console.error('❌ فشل في تهيئة قاعدة البيانات:', error.message);
    }
}

// 🔥 تشغيل التهيئة
initializeDatabase();

// ⚙️ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 👥 مستخدمين متصلين
const onlineUsers = new Map();

// 🔌 Socket.IO للتواصل المباشر
io.on('connection', (socket) => {
    console.log('🔌 مستخدم متصل:', socket.id);

    // تسجيل المستخدم كمتصل
    socket.on('user_online', (userId) => {
        onlineUsers.set(userId.toString(), socket.id);
        console.log(`👤 المستخدم ${userId} متصل الآن`);
    });

    // انضمام للدردشة
    socket.on('join_dashboard', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`📊 المستخدم ${userId} انضم للوحة التحكم`);
    });

    // تحديث بيانات في الوقت الحقيقي
    socket.on('data_updated', (data) => {
        socket.broadcast.emit('refresh_data', data);
    });

    // قطع الاتصال
    socket.on('disconnect', () => {
        console.log('🔌 مستخدم منقطع:', socket.id);
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
    });
});

// 📝 تسجيل الطلبات
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 🏥 فحص الصحة
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'سيرفر Data Vision شغال' });
});

// 🧪 فحص الاتصال بقاعدة البيانات
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const customersCount = await pool.query('SELECT COUNT(*) FROM customers');
        const salesCount = await pool.query('SELECT COUNT(*) FROM sales');
        
        res.json({ 
            status: 'working', 
            message: '✅ السيرفر متصل بقاعدة البيانات!',
            database_time: result.rows[0].time,
            users_count: parseInt(usersCount.rows[0].count),
            customers_count: parseInt(customersCount.rows[0].count),
            sales_count: parseInt(salesCount.rows[0].count),
            database: 'Neon PostgreSQL'
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'فشل الاتصال بقاعدة البيانات',
            details: error.message 
        });
    }
});

// 🔐 نظام المصادقة

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 محاولة تسجيل دخول:', req.body);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني وكلمة المرور مطلوبان' 
            });
        }

        // البحث عن المستخدم
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', 
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }

        const user = result.rows[0];
        
        // التحقق من كلمة المرور
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
            });
        }

        console.log('✅ تسجيل دخول ناجح:', user.email);

        // إنشاء توكن
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // إرجاع البيانات بدون كلمة المرور
        const userResponse = { 
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
        };

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح!',
            user: userResponse,
            token
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر: ' + error.message 
        });
    }
});

// إنشاء حساب جديد
app.post('/api/auth/register', async (req, res) => {
    console.log('📝 محاولة تسجيل جديد:', req.body);
    
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'جميع الحقول مطلوبة' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' 
            });
        }

        // التحقق من وجود المستخدم
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1', 
            [email]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'البريد الإلكتروني مسجل مسبقاً' 
            });
        }

        // تشفير كلمة المرور
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // حفظ المستخدم
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash) 
             VALUES ($1, $2, $3) 
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        console.log('✅ مستخدم جديد مسجل:', result.rows[0].email);

        // إنشاء توكن
        const token = jwt.sign(
            { userId: result.rows[0].id, email: result.rows[0].email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح!',
            user: result.rows[0],
            token
        });

    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في السيرفر: ' + error.message 
        });
    }
});

// Middleware للتحقق من التوكن
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'رمز الدخول مطلوب' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'رمز الدخول غير صالح' });
        }
        req.user = user;
        next();
    });
};

// 📊 إحصائيات المستخدم
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const customersCount = await pool.query(
            'SELECT COUNT(*) FROM customers WHERE user_id = $1',
            [userId]
        );

        const salesCount = await pool.query(
            'SELECT COUNT(*) FROM sales WHERE user_id = $1',
            [userId]
        );

        const totalSales = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE user_id = $1',
            [userId]
        );

        const activeCustomers = await pool.query(
            'SELECT COUNT(*) FROM customers WHERE user_id = $1 AND status = $2',
            [userId, 'active']
        );

        res.json({
            success: true,
            stats: {
                totalCustomers: parseInt(customersCount.rows[0].count),
                totalSales: parseInt(salesCount.rows[0].count),
                salesAmount: parseFloat(totalSales.rows[0].total),
                activeCustomers: parseInt(activeCustomers.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في جلب الإحصائيات' 
        });
    }
});

// 👥 إدارة العملاء

// جلب عملاء المستخدم
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await pool.query(
            `SELECT c.*, 
                    COUNT(s.id) as sales_count,
                    COALESCE(SUM(s.amount), 0) as total_purchases
             FROM customers c
             LEFT JOIN sales s ON c.id = s.customer_id
             WHERE c.user_id = $1
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            customers: result.rows
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في جلب العملاء' 
        });
    }
});

// إضافة عميل جديد
app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, phone, email, status, notes } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ 
                success: false,
                error: 'الاسم ورقم الهاتف مطلوبان' 
            });
        }

        const result = await pool.query(
            `INSERT INTO customers (user_id, name, phone, email, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [userId, name, phone, email, status, notes]
        );

        // إشعار في الوقت الحقيقي
        io.emit('customer_added', { userId, customer: result.rows[0] });

        res.status(201).json({
            success: true,
            message: 'تم إضافة العميل بنجاح',
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Add customer error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في إضافة العميل' 
        });
    }
});

// تحديث عميل
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const customerId = req.params.id;
        const { name, phone, email, status, notes } = req.body;

        // التحقق من ملكية العميل
        const customerCheck = await pool.query(
            'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
            [customerId, userId]
        );

        if (customerCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'العميل غير موجود' 
            });
        }

        const result = await pool.query(
            `UPDATE customers 
             SET name = $1, phone = $2, email = $3, status = $4, notes = $5 
             WHERE id = $6 AND user_id = $7 
             RETURNING *`,
            [name, phone, email, status, notes, customerId, userId]
        );

        res.json({
            success: true,
            message: 'تم تحديث العميل بنجاح',
            customer: result.rows[0]
        });

    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في تحديث العميل' 
        });
    }
});

// حذف عميل
app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const customerId = req.params.id;

        // التحقق من ملكية العميل
        const customerCheck = await pool.query(
            'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
            [customerId, userId]
        );

        if (customerCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'العميل غير موجود' 
            });
        }

        await pool.query('DELETE FROM customers WHERE id = $1 AND user_id = $2', [customerId, userId]);

        res.json({
            success: true,
            message: 'تم حذف العميل بنجاح'
        });

    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في حذف العميل' 
        });
    }
});

// 💰 إدارة المبيعات

// جلب مبيعات المستخدم
app.get('/api/sales', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const result = await pool.query(
            `SELECT s.*, c.name as customer_name
             FROM sales s
             LEFT JOIN customers c ON s.customer_id = c.id
             WHERE s.user_id = $1
             ORDER BY s.sale_date DESC`,
            [userId]
        );

        res.json({
            success: true,
            sales: result.rows
        });

    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في جلب المبيعات' 
        });
    }
});

// إضافة بيع جديد
app.post('/api/sales', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { customer_id, amount, sale_date, description } = req.body;

        if (!customer_id || !amount || !sale_date) {
            return res.status(400).json({ 
                success: false,
                error: 'العميل والمبلغ والتاريخ مطلوبون' 
            });
        }

        // التحقق من ملكية العميل
        const customerCheck = await pool.query(
            'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
            [customer_id, userId]
        );

        if (customerCheck.rows.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'العميل غير موجود' 
            });
        }

        const result = await pool.query(
            `INSERT INTO sales (user_id, customer_id, amount, sale_date, description) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [userId, customer_id, amount, sale_date, description]
        );

        // إشعار في الوقت الحقيقي
        io.emit('sale_added', { userId, sale: result.rows[0] });

        res.status(201).json({
            success: true,
            message: 'تم إضافة البيع بنجاح',
            sale: result.rows[0]
        });

    } catch (error) {
        console.error('Add sale error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في إضافة البيع' 
        });
    }
});

// 🤖 المساعد الذكي
app.post('/api/ai/analyze', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { message } = req.body;

        // جلب بيانات المستخدم للتحليل
        const customersCount = await pool.query(
            'SELECT COUNT(*) FROM customers WHERE user_id = $1',
            [userId]
        );

        const salesData = await pool.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
             FROM sales WHERE user_id = $1`,
            [userId]
        );

        const activeCustomers = await pool.query(
            'SELECT COUNT(*) FROM customers WHERE user_id = $1 AND status = $2',
            [userId, 'active']
        );

        const data = {
            totalCustomers: parseInt(customersCount.rows[0].count),
            totalSales: parseInt(salesData.rows[0].count),
            salesAmount: parseFloat(salesData.rows[0].total),
            activeCustomers: parseInt(activeCustomers.rows[0].count)
        };

        // تحليل البيانات وإرجاع رد ذكي
        const analysis = generateAIAnalysis(message, data);
        
        res.json({
            success: true,
            response: analysis
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطأ في التحليل' 
        });
    }
});

// دالة التحليل الذكي
function generateAIAnalysis(message, data) {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('عملاء') || lowerMsg.includes('زبائن')) {
        const inactiveCustomers = data.totalCustomers - data.activeCustomers;
        const activeRate = data.totalCustomers > 0 ? (data.activeCustomers / data.totalCustomers * 100).toFixed(1) : 0;
        
        return `👥 تحليل العملاء:

📊 الإحصائيات:
• إجمالي العملاء: ${data.totalCustomers}
• العملاء النشطين: ${data.activeCustomers}
• العملاء غير النشطين: ${inactiveCustomers}
• معدل النشاط: ${activeRate}%

💡 التوصيات:
${inactiveCustomers > 0 ? 
  `• ركز على متابعة ${inactiveCustomers} عميل غير نشط
• أرسل عروضاً حصرية لإعادتهم` : 
  '• ممتاز! جميع عملائك نشطين'}`;
    }

    if (lowerMsg.includes('مبيعات') || lowerMsg.includes('ربح')) {
        const avgSale = data.totalSales > 0 ? (data.salesAmount / data.totalSales).toFixed(2) : 0;
        
        return `💰 تحليل المبيعات:

📈 الأداء:
• إجمالي المبيعات: ${data.salesAmount} دينار
• عدد العمليات: ${data.totalSales}
• متوسط البيع: ${avgSale} دينار

🎯 الاستراتيجيات:
${data.totalSales === 0 ? '• ابدأ بتسجيل مبيعاتك الأولى' :
 avgSale < 100 ? '• ركز على زيادة متوسط قيمة البيع' : 
 '• وسع قنوات البيع والتسويق'}`;
    }

    return `🤖 مساعد Data Vision

📊 نظرة عامة على أدائك:
• ${data.totalCustomers} عميل
• ${data.totalSales} عملية بيع
• ${data.salesAmount} دينار إجمالي مبيعات

💡 اسألني عن:
• "تحليل العملاء"
• "تحليل المبيعات" 
• "تقرير شامل"

أنا هنا لمساعدتك في تحسين أداء متجرك! 🚀`;
}

// 🛠️ إدارة النظام

// إعادة تهيئة قاعدة البيانات
app.post('/api/admin/init-db', async (req, res) => {
    try {
        await initializeDatabase();
        res.json({ 
            success: true,
            message: '✅ تم تهيئة قاعدة البيانات بنجاح' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'خطأ في التهيئة' 
        });
    }
});

// فحص حالة قاعدة البيانات
app.get('/api/admin/db-status', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        res.json({ 
            success: true,
            tables: result.rows,
            message: `📋 عدد الجداول: ${result.rows.length}`
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'خطأ في فحص قاعدة البيانات' 
        });
    }
});

// 🌐 تقديم الملفات الثابتة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 🔥 تشغيل السيرفر
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Data Vision server running on port ${PORT}`);
    console.log(`🌐 Live at: https://your-app.onrender.com`);
    console.log(`📊 Connected to: Neon PostgreSQL Database`);
    console.log(`🔌 Socket.IO ready for real-time updates`);
    console.log(`🔍 Test endpoints:`);
    console.log(`   - https://your-app.onrender.com/api/test`);
    console.log(`   - https://your-app.onrender.com/health`);
});
