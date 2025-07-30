require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// إعداد Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// وسائط
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // لعرض صفحات HTML

// جدول المقالات
const BLOG_TABLE = 'zid_blog_posts';

// 🌐 الجذر: رسالة ترحيب
app.get('/', (req, res) => {
  res.send(`
    <h1>تطبيق مدونتي لمتجر زد</h1>
    <p>جاهز للعمل! 🚀</p>
    <a href="/blog">عرض المدونة</a>
  `);
});

// 📝 عرض المقالات
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
        data.map(p => `<div><h3>${p.title}</h3><p>${p.content.substring(0, 100)}...</p></div><hr>`)
        .join('') : 
        '<p>لا توجد مقالات بعد.</p>'}
    </body>
    </html>`;
  res.send(html);
});

// 📥 إضافة مقال (سيستخدمه لوحة التحكم لاحقاً)
app.post('/api/posts', async (req, res) => {
  const { title, content, store_id } = req.body;

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .insert([{ title, content, store_id, created_at: new Date() }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// ✅ اختبار الاتصال
app.get('/test', (req, res) => {
  res.json({ status: 'working', time: new Date() });
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${port}`);
});