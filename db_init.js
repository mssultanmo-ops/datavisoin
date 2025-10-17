// db_init.js - كود تهيئة قاعدة البيانات بدون بيانات وهمية
const { Pool } = require('pg');
require('dotenv').config();

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// كود SQL لإنشاء الجداول فقط
const initSQL = `
-- حذف الجداول إذا كانت موجودة (للتطوير فقط)
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- جدول المستخدمين
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول العملاء
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(255) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول المبيعات
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء indexes للأداء
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_sales_date ON sales(sale_date);

-- عرض تأكيد الإنشاء
SELECT '✅ تم إنشاء الجداول بنجاح' as message;
`;

// دالة تهيئة قاعدة البيانات
async function initializeDatabase() {
    let client;
    try {
        console.log('🚀 بدء تهيئة قاعدة البيانات...');
        
        // الاتصال بقاعدة البيانات
        client = await pool.connect();
        console.log('✅ تم الاتصال بقاعدة البيانات');
        
        // تنفيذ كود SQL
        console.log('📝 جاري إنشاء الجداول...');
        await client.query(initSQL);
        
        console.log('🎉 تم تهيئة قاعدة البيانات بنجاح!');
        console.log('📋 الجداول التي تم إنشاؤها:');
        console.log('   👥 users - جدول المستخدمين');
        console.log('   👨‍💼 customers - جدول العملاء'); 
        console.log('   💰 sales - جدول المبيعات');
        
    } catch (error) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', error.message);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('\n✅ تم إنهاء الاتصال بقاعدة البيانات');
    }
}

// دالة لعرض حالة قاعدة البيانات
async function checkDatabaseStatus() {
    let client;
    try {
        client = await pool.connect();
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('📋 الجداول الموجودة في قاعدة البيانات:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error.message);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

// التعامل مع أوامر التشغيل
const command = process.argv[2];

switch (command) {
    case 'init':
        initializeDatabase();
        break;
    case 'status':
        checkDatabaseStatus();
        break;
    case 'help':
    default:
        console.log(`
🎯 أوامر إدارة قاعدة البيانات - Data Vision

🔹 الاستخدام:
  node db_init.js <command>

🔹 الأوامر المتاحة:
  init    - تهيئة قاعدة البيانات وإنشاء الجداول
  status  - عرض حالة قاعدة البيانات
  help    - عرض هذه المساعدة

🔹 أمثلة:
  node db_init.js init     💾 تهيئة الجداول
  node db_init.js status   📊 عرض الحالة

🔹 ملاحظات:
  - تأكد من إعداد متغير DATABASE_URL في ملف .env
  - لا يتم إضافة أي بيانات وهمية
        `);
        break;
}
