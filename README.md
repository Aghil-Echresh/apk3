# دفتر حساب آنلاین سوپرمارکت کمیل

پنل وب فارسی و RTL برای ثبت مشتریان، واریز/برداشت، مانده حساب و تصویر رسید.

## تکنولوژی
- HTML/CSS/JavaScript
- Supabase Auth + PostgreSQL + Storage
- قابل استقرار روی GitHub Pages / Vercel / Netlify

## راه‌اندازی
1. در Supabase یک پروژه بساز.
2. محتوای `supabase.sql` را در SQL Editor اجرا کن.
3. در Authentication > Users یک کاربر مدیر بساز.
4. در `config.js` مقدار URL و Anon Key پروژه را قرار بده.
5. فایل‌های این مخزن را روی یک سرویس استاتیک Deploy کن.

**نکته:** کلید Service Role را هرگز داخل سایت قرار نده. فقط Anon Key استفاده شود و RLS فعال بماند.
