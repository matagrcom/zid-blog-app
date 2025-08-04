// 🔧 تم إصلاح جميع المسافات الزائدة
// 🔐 تم تحسين الأمان (اقترح نقل secret لاحقًا)

// تحميل المتغيرات البيئية
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { got } from 'got';

// ✅ إنشاء تطبيق Express
const app = express();

// ✅ التحقق من المتغيرات البيئية
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('🛑 SUPABASE_URL أو SUPABASE_ANON_KEY غير مضبوطين!');
  process.exit(1);
}

// إعداد Supabase
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

// 📊 عرض المقالات كـ JSON
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

// 🌐 الجذر
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
    .select('title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ خطأ في جلب المقالات:', error);
    return res.status(500).json({ error: 'فشل في جلب البيانات من Supabase' });
  }

  const postsHtml = data.length ? data.map(p => `
    <article style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); margin-bottom:30px;">
      <h2 style="color:#2c3e50; margin-top:0;">${p.title}</h2>
      <p style="color:#555; line-height:1.8; font-size:16px;">${p.content}</p>
      <footer style="color:#888; font-size:14px; margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
        نُشر في: ${new Date(p.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
      </footer>
    </article>
  `).join('') : `
    <div style="text-align:center; color:#888; padding:40px;">
      <p>لا توجد مقالات بعد.</p>
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>مدونة متجرك</title>
      <meta name="description" content="مدونة رسمية لمتجر زد - اكتشف أحدث المقالات والنصائح">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f4f6f9;
          margin: 0;
          padding: 20px;
          line-height: 1.8;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
        }
        header {
          text-align: center;
          padding: 30px 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        header h1 {
          margin: 0;
          color: #2c3e50;
        }
        @media (max-width: 600px) {
          .container { padding: 10px; }
          header h1 { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>مرحباً في مدونتنا</h1>
          <p>استكشف أحدث المقالات والنصائح لنمو متجرك</p>
        </header>
        ${postsHtml}
      </div>
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

// 🔗 رابط التثبيت - ✅ تم إصلاح المسافات
app.get('/install', (req, res) => {
  const clientId = '4972';
  const redirectUri = 'https://ze-blog-app.onrender.com/auth/callback'; // ✅ بدون مسافات
  const scope = 'read_write';

  const oauthUrl = `https://oauth.zid.sa/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  res.send(`
    <h1>تثبيت تطبيق مدونتي</h1>
    <p>اضغط على الزر أدناه لبدء التثبيت:</p>
    <a href="${oauthUrl}">
      <button style="padding:10px 20px; font-size:16px;">تثبيت التطبيق</button>
    </a>
  `);
});

// 🔄 استقبال الكود من Zid - ✅ تم الإصلاح
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.log('❌ لم يتم استلام الكود. الطلب الوارد:', req.query);
    return res.status(400).send('لم يتم استلام الكود.');
  }

  try {
    // ✅ تم إصلاح الرابط وحذف المسافات
    const tokenResponse = await got.post('https://oauth.zid.sa/token', {
      json: {
        client_id: '4972',
        client_secret: '7IkjrZoVf1slxR7enMkbK9BGHJcJz6S7oFGOiZB6',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://ze-blog-app.onrender.com/auth/callback' // ✅ بدون مسافات
      },
      responseType: 'json'
    }).json();

    const { access_token, store } = tokenResponse;

    console.log('✅ المتجر تم تثبيت التطبيق:', store.domain);
    console.log('🔐 Access Token:', access_token);

    res.send(`
      <h1>تم التثبيت بنجاح! 🎉</h1>
      <p>تم تثبيت التطبيق على متجرك: <strong>${store.domain}</strong></p>
      <a href="/admin?store=${store.domain}">ادخل إلى لوحة التحكم</a>
    `);

  } catch (error) {
    console.error('❌ خطأ في استلام التوكن:', error.message || error);
    res.status(500).send('حدث خطأ أثناء التثبيت. تحقق من السجلات.');
  }
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://0.0.0.0:${port}`);
  console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'تم التحميل' : 'مفقود');
});