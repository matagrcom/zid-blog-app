// 📝 عرض المقالات (بتصميم جميل)
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