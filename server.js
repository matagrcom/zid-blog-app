import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

// ✅ إعداد Supabase باستخدام متغيرات البيئة الصحيحة
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Supabase URL and Key are required. تأكد من ضبط المتغيرات في Render.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ إعدادات Express
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // لعرض صفحات HTML

// 🗂️ اسم جدول المقالات
const BLOG_TABLE = 'zid_blog_posts';

// 🌐 الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <h1>تطبيق مدونتي لمتجر زد</h1>
    <p>جاهز للعمل! 🚀</p>
    <a href="/blog">عرض المدونة</a>
  `);
});

// 📝 عرض المدونة
app.get('/blog', async (req, res) => {
  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const html = `
    <html>
    <head><title>مدونة متجرك</title></head>
    <body>
      <h1>مرحباً في مدونتنا</h1>
      ${data.length ? 
        data.map(p => `<div><h3>${p.title}</h3><p>${p.content.substring(0, 100)}...</p></div><hr>`).join('') :
        '<p>لا توجد مقالات بعد.</p>'}
    </body>
    </html>`;
    
  res.send(html);
});

// ➕ إضافة مقال جديد
app.post('/api/posts', async (req, res) => {
  const { title, content, store_id } = req.body;

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .insert([{ title, content, store_id, created_at: new Date() }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// ✅ اختبار السيرفر
app.get('/test', (req, res) => {
  res.json({ status: 'working', time: new Date() });
});

// 🚀 تشغيل الخادم
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ الخادم يعمل على http://localhost:${port}`);
});
