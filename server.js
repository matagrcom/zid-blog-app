import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import got from 'got';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----- Env -----
const CLIENT_ID = process.env.CLIENT_ID || process.env.ZID_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.ZID_OAUTH_CLIENT_SECRET;

let REDIRECT_URI = process.env.REDIRECT_URI;
if (!REDIRECT_URI) {
  const external = process.env.RENDER_EXTERNAL_URL || 'https://ze-blog-app.onrender.com';
  REDIRECT_URI = `${external.replace(/\/$/, '')}/auth/callback`;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

[['CLIENT_ID', CLIENT_ID], ['CLIENT_SECRET', CLIENT_SECRET], ['REDIRECT_URI', REDIRECT_URI],
 ['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_ANON_KEY', SUPABASE_ANON_KEY], ['SUPABASE_SERVICE_ROLE', SUPABASE_SERVICE_ROLE]
].forEach(([k,v])=>{ if(!v) console.warn('⚠️ Missing env:', k); });

// ----- Supabase clients -----
const BLOG_TABLE = 'zid_blog_posts';
// للقراءة العامّة (RLS و anon)
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// للكتابة (يتجاوز RLS)
const supabaseAdmin  = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// ----- OAuth with Zid -----
app.get('/install', (req, res) => {
  if (!CLIENT_ID || !REDIRECT_URI) return res.status(500).send('❌ إعدادات OAuth ناقصة.');
  const authUrl = `https://oauth.zid.sa/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=read_write`;
  res.send(`<h2>تثبيت تطبيق المدونة</h2><a href="${authUrl}"><button style="padding:10px 20px;font-size:16px">تثبيت التطبيق</button></a>`);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('❌ لا يوجد كود تفويض');
  try {
    const tokenRes = await got.post('https://oauth.zid.sa/oauth/token', {
      form: { grant_type:'authorization_code', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, code, redirect_uri:REDIRECT_URI },
      responseType:'json', throwHttpErrors:false
    });
    if (tokenRes.statusCode >= 400) {
      console.error('Token exchange failed:', tokenRes.statusCode, tokenRes.body);
      return res.status(500).send('❌ فشل جلب التوكن من زد.');
    }
    // TODO: احفظ access_token و store_id لاحقًا
    res.send(`<h3>✅ تم التثبيت بنجاح!</h3><p><a href="/admin">لوحة التحكم</a> • <a href="/blog">عرض المدونة</a></p>`);
  } catch (e) {
    console.error('OAuth error:', e?.response?.body || e.message);
    res.status(500).send('❌ حدث خطأ أثناء التثبيت.');
  }
});

// ----- Blog pages -----
app.get('/blog', async (req, res) => {
  const { data, error } = await supabasePublic
    .from(BLOG_TABLE).select('title, content, created_at').order('created_at', { ascending: false });
  if (error) return res.status(500).send('فشل جلب المقالات');
  const postsHtml = (data?.length ? data.map(p => `
    <article style="background:white;padding:25px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.1);margin-bottom:30px;">
      <h2 style="margin:0 0 10px;color:#2c3e50">${p.title}</h2>
      <p style="color:#555;line-height:1.8">${p.content}</p>
      <footer style="color:#888;font-size:14px;margin-top:10px;border-top:1px solid #eee;padding-top:8px">
        ${new Date(p.created_at).toLocaleDateString('ar-SA')}
      </footer>
    </article>`).join('') : `<div style="text-align:center;color:#888;padding:40px">لا توجد مقالات بعد.</div>`);
  res.send(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>مدونة متجرك</title><style>body{font-family:Segoe UI,Tahoma,Verdana,sans-serif;background:#f4f6f9;margin:0;padding:20px}.container{max-width:900px;margin:0 auto}header{text-align:center;padding:30px;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.1);margin-bottom:30px}</style></head><body><div class="container"><header><h1>مرحباً في مدونتنا</h1></header>${postsHtml}</div></body></html>`);
});

// JSON for admin.html
app.get('/blog-data', async (req, res) => {
  const { data, error } = await supabasePublic
    .from(BLOG_TABLE).select('title, content, created_at').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create post (writes via service role)
app.post('/api/posts', async (req, res) => {
  const { title, content, store_id } = req.body || {};
  if (!title || !content || !store_id) return res.status(400).json({ error: 'الحقول title و content و store_id مطلوبة' });
  const { data, error } = await supabaseAdmin
    .from(BLOG_TABLE).insert([{ title, content, store_id, created_at: new Date() }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, data });
});

// Admin page
app.get('/admin', (req, res) => {
  const candidates = [path.join(__dirname, 'public', 'admin.html'), path.join(__dirname, 'admin.html')];
  const existing = candidates.find(p => fs.existsSync(p));
  if (!existing) return res.status(404).send('لم يتم العثور على admin.html');
  res.sendFile(existing);
});

app.get('/', (req, res) => res.send('<h1>Faisal Blog</h1><a href="/blog">المدونة</a> • <a href="/admin">لوحة التحكم</a> • <a href="/install">تثبيت</a>'));

app.get('/test', (req, res) => {
  res.json({
    status: 'working',
    using_client_id_key: process.env.CLIENT_ID ? 'CLIENT_ID' : (process.env.ZID_OAUTH_CLIENT_ID ? 'ZID_OAUTH_CLIENT_ID' : null),
    using_client_secret_key: process.env.CLIENT_SECRET ? 'CLIENT_SECRET' : (process.env.ZID_OAUTH_CLIENT_SECRET ? 'ZID_OAUTH_CLIENT_SECRET' : null),
    client_id_present: !!CLIENT_ID,
    client_secret_present: !!CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    supabase_url_present: !!SUPABASE_URL,
    supabase_anon_present: !!SUPABASE_ANON_KEY,
    supabase_service_role_present: !!SUPABASE_SERVICE_ROLE
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Running on http://0.0.0.0:${PORT}`);
  console.log('✅ REDIRECT_URI:', REDIRECT_URI);
});
