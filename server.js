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

// 🖥️ عرض لوحة التحكم
app.get('/admin', (req, res) => {
  res.sendFile(new URL('./admin.html', import.meta.url).pathname);
});

// 📊 عرض المقالات كـ JSON (للوحة التحكم)
app.get('/blog-data', async (req, res) => {
  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select('title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 📥 إضافة مقالة
app.post('/api/posts', async (req, res) => {
  const { title, content, store_id } = req.body;

  if (!title || !content || !store_id) {
    return res.status(400).json({ error: 'الحقول title و content و store_id مطلوبة' });
  }

  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .insert([{ title, content, store_id, created_at: new Date() }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

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

// 🔗 رابط التثبيت
app.get('/install', (req, res) => {
  const clientId = '4972';
  const redirectUri = 'https://ze-blog-app.onrender.com/auth/callback';
  const scope = 'read_write';

  const oauthUrl = `https://oauth.zid.sa/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  res.send(`
    <h1>تثبيت تطبيق مدونتي</h1>
    <p>اضغط على الزر أدناه لبدء التثبيت:</p>
    <a href="${oauthUrl}">
      <button style="padding:10px 20px; font-size:16px;">تثبيت التطبيق</button>
    </a>
  `);
});

// 🔄 استقبال الكود من Zid
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('لم يتم استلام الكود.');
  }

  try {
    // استبدال الكود بـ Access Token
    const tokenResponse = await got.post('https://oauth.zid.sa/token', {
      json: {
        client_id: '4972',
        client_secret: '7IkjrZoVf1slxR7enMkbK9BGHJcJz6S7oFGOiZB6',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://ze-blog-app.onrender.com/auth/callback'
      },
      responseType: 'json'
    }).json();

    const { access_token, store } = tokenResponse;

    // تسجيل المعلومات في السجل
    console.log('✅ المتجر تم تثبيت التطبيق:', store.domain);
    console.log('🔐 Access Token:', access_token);

    // توجيه المستخدم إلى لوحة التحكم
    res.send(`
      <h1>تم التثبيت بنجاح! 🎉</h1>
      <p>تم تثبيت التطبيق على متجرك: <strong>${store.domain}</strong></p>
      <a href="/admin?store=${store.domain}">ادخل إلى لوحة التحكم</a>
    `);

  } catch (error) {
    console.error('❌ خطأ في استلام التوكن:', error);
    res.status(500).send('حدث خطأ أثناء التثبيت.');
  }
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://0.0.0.0:${port}`);
  console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'تم التحميل' : 'مفقود');
});