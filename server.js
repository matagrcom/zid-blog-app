// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import got from 'got';
import { createClient } from '@supabase/supabase-js';

// مسارات
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تطبيق
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// متغيرات البيئة (لا تحط أسرارك في الكود)
const CLIENT_ID = process.env.CLIENT_ID;                 // مثال: 5008
const CLIENT_SECRET = process.env.CLIENT_SECRET;         // من لوحة زد
const REDIRECT_URI = process.env.REDIRECT_URI;           // مثال: https://ze-blog-app.onrender.com/auth/callback

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// تحقق من المتغيرات الأساسية
['CLIENT_ID','CLIENT_SECRET','REDIRECT_URI','SUPABASE_URL','SUPABASE_ANON_KEY'].forEach(k=>{
  if (!process.env[k]) console.warn(`⚠️ Missing env: ${k}`);
});

// Supabase
const BLOG_TABLE = 'zid_blog_posts';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// صفحة التثبيت (ينقلك لتفويض زد)
app.get('/install', (req, res) => {
  const authUrl =
    `https://oauth.zid.sa/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=read_write`;
  res.send(`
    <h2>تثبيت تطبيق مدونتي</h2>
    <p>اضغط على الزر أدناه لبدء التثبيت:</p>
    <a href="${authUrl}"><button style="padding:10px 20px;font-size:16px">تثبيت التطبيق</button></a>
  `);
});

// استقبال كود التفويض وتبديله بتوكن
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('❌ لم يتم العثور على كود التفويض');

  try {
    const tokenRes = await got.post('https://oauth.zid.sa/oauth/token', {
      form: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI
      },
      responseType: 'json'
    });

    const body = tokenRes.body || {};
    console.log('✅ Token exchange OK:', body);

    res.send(`
      <h3>✅ تم التثبيت بنجاح!</h3>
      <p>تم الربط مع زد. يمكنك الآن الذهاب إلى <a href="/admin">لوحة التحكم</a> أو <a href="/blog">عرض المدونة</a>.</p>
    `);
  } catch (err) {
    console.error('❌ خطأ أثناء طلب التوكن:', err.response?.body || err.message);
    res.status(500).send('❌ حدث خطأ أثناء التثبيت. تحقق من السجلات.');
  }
});

// عرض المدونة
app.get('/blog', async (req, res) => {
  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .select('title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ خطأ في جلب المقالات:', error);
    return res.status(500).json({ error: 'فشل في جلب البيانات من Supabase' });
  }

  const postsHtml = (data && data.length) ? data.map(p => `
    <article style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); margin-bottom:30px;">
      <h2 style="color:#2c3e50; margin-top:0;">${p.title}</h2>
      <p style="color:#555; line-height:1.8; font-size:16px;">${p.content}</p>
      <footer style="color:#888; font-size:14px; margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
        نُشر في: ${new Date(p.created_at).toLocaleDateString('ar-SA')}
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
        body {font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f4f6f9; margin:0; padding:20px; line-height:1.8;}
        .container {max-width:900px; margin:0 auto;}
        header {text-align:center; padding:30px 0; background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); margin-bottom:30px;}
        header h1 {margin:0; color:#2c3e50;}
        @media (max-width:600px){ .container{padding:10px;} header h1{font-size:24px;} }
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

// API: إضافة مقالة
app.post('/api/posts', async (req, res) => {
  const { title, content, store_id } = req.body || {};
  if (!title || !content || !store_id) {
    return res.status(400).json({ error: 'الحقول title و content و store_id مطلوبة' });
  }
  const { data, error } = await supabase
    .from(BLOG_TABLE)
    .insert([{ title, content, store_id, created_at: new Date() }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// لوحة التحكم البسيطة (ملف HTML موجود عندك)
app.get('/admin', (req, res) => {
  res.sendFile(new URL('./admin.html', import.meta.url).pathname);
});

// الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <h1>تطبيق مدونتي لمتجر زد</h1>
    <p>جاهز للعمل! 🚀</p>
    <a href="/blog">عرض المدونة</a> • <a href="/install">تثبيت التطبيق</a>
  `);
});

// فحص سريع
app.get('/test', (req, res) => {
  res.json({
    status: 'working',
    client_id: !!CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    supabase_url: !!SUPABASE_URL,
    supabase_key: !!SUPABASE_ANON_KEY
  });
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://0.0.0.0:${PORT}`);
  console.log('✅ REDIRECT_URI:', REDIRECT_URI);
});
