export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="bn">
  <head>
    <meta charset="utf-8" />
    <title>একটু সমস্যা হয়েছে — Smart Investor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <style>
      *{box-sizing:border-box}
      body{font:15px/1.55 'Hind Siliguri',system-ui,-apple-system,sans-serif;background:linear-gradient(160deg,#fff7ed 0%,#fef2f2 50%,#ecfdf5 100%);color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;padding:1.5rem}
      .card{max-width:26rem;width:100%;text-align:center;padding:2rem 1.75rem;background:#fff;border-radius:1.25rem;box-shadow:0 20px 45px -20px rgba(15,23,42,.25);border:1px solid rgba(15,23,42,.06)}
      .icon{width:72px;height:72px;margin:0 auto 1rem;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f43f5e);display:grid;place-items:center;color:#fff;font-size:36px;font-weight:900;box-shadow:0 10px 25px -10px rgba(244,63,94,.55)}
      h1{font-size:1.35rem;margin:0 0 .5rem;color:#0f172a;font-weight:700}
      p{color:#475569;margin:0 0 1.5rem;font-size:.95rem}
      .actions{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}
      a,button{padding:.7rem 1.15rem;border-radius:.75rem;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:transform .15s ease,box-shadow .15s ease}
      a:active,button:active{transform:scale(.97)}
      .primary{background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;box-shadow:0 8px 20px -8px rgba(239,68,68,.5)}
      .secondary{background:#f8fafc;color:#0f172a;border-color:#e2e8f0}
      .hint{margin-top:1rem;font-size:.8rem;color:#94a3b8}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">!</div>
      <h1>সাময়িক সমস্যা</h1>
      <p>একটু আগে পেজটি লোড হতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন — কয়েক সেকেন্ডে ঠিক হয়ে যাবে।</p>
      <div class="actions">
        <button class="primary" onclick="(function(){try{location.reload()}catch(e){location.href=location.pathname}})()">আবার চেষ্টা করুন</button>
        <a class="secondary" href="/">হোমে ফিরুন</a>
      </div>
      <p class="hint">সমস্যা চলতে থাকলে কিছুক্ষণ পরে আবার আসুন।</p>
    </div>
  </body>
</html>`;
}
