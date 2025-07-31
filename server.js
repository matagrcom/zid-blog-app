// تحميل المتغيرات البيئية
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { got } from 'got';

const app = express();

// ✅ التحقق من المتغيرات البيئية
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('🛑 SUPABASE_URL أو SUPABASE_ANON_KEY غير مضبوطين!');
  process.exit(1);
}

// إعداد Supabase مع تمرير got كـ fetch
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    global: {
      fetch: got.extend({ decompress: true }).fetch
    }
  }
);

// وسائط
app.use(cors());
app.use(express.json());

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
    .select('title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ خطأ في جلب المقالات:', error);
    return res.status(500).json({ error: 'فشل في جلب البيانات من Supabase' });
  }

  const html = `
    <html>
    <head><title>مدونة متجرك</title></head>
    <body style="font-family:Arial">
      <h1>مرحباً في مدونتنا</h1>
      ${data.length ? 
        data.map(p => `
          <div style="margin-bottom: 20px">
            <h3>${p.title}</h3>
            <p>${p.content.substring(0, 200)}...</p>
            <small>${new Date(p.created_at).toLocaleDateString('ar-SA')}</small>
            <hr>
          </div>
        `).join('') : 
        '<p>لا توجد مقالات بعد.</p>'}
    </body>
    </html>`;
  res.send(html);
});

// ✅ اختبار الاتصال
app.get('/test', (req, res) => {
  res.json({ 
    status: 'working', 
    time: new Date(),
    supabase_url: process.env.SUPABASE_URL?.includes('supabase.co') ? 'set' : 'missing',
    supabase_key: process.env.SUPABASE_ANON_KEY ? 'set' : 'missing'
  });
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://0.0.0.0:${port}`);
  console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'تم التحميل' : 'مفقود');
});