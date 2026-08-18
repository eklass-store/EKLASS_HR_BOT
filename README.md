# Challengawy 🚀

نظام متكامل لإدارة الموارد البشرية يعمل عبر بوت تيليجرام للموظفين ولوحة تحكم PWA للإدارة.

هذا المستودع مخصص لتشغيل نسخة واحدة مستقلة من نظام Challengawy لجهة واحدة، مع قاعدة بيانات D1 واحدة وبوت تيليجرام واحد. لا يحتوي النظام على طبقة تعدد شركات أو عزل بيانات بين مستأجرين.

## التقنيات

- Cloudflare Pages وWorkers
- Cloudflare D1 (SQLite Edge Database)
- grammY وTelegram Bot API
- Vue 3 وVite وTailwind CSS وPWA

## التشغيل والنشر

ثبّت الاعتماديات ثم أنشئ نسخة الإنتاج من لوحة التحكم:

```bash
npm install
npm run build
```

للنشر على Cloudflare، اربط المشروع بحساب Cloudflare الذي سيستضيف نسخة Challengawy، ثم نفّذ:

```bash
npx wrangler login
npx wrangler d1 execute hr-system-db --file=./schema.sql --remote
npm run deploy
```

## أسرار التشغيل

أضف الأسرار التالية من إعدادات Cloudflare، ولا تضع قيمها داخل المستودع:

- `BOT_TOKEN`: توكن بوت تيليجرام الخاص بنسخة Challengawy.
- `JWT_SECRET`: مفتاح عشوائي طويل لتوقيع جلسات لوحة التحكم.
- `WEBHOOK_SECRET`: قيمة اختيارية للتحقق من طلبات Telegram webhook.
- `API_KEY`: قيمة اختيارية للوصول البرمجي.
- `ALLOWED_ORIGIN`: نطاق لوحة التحكم المسموح به في CORS.

يجب إضافة أول موظف بصلاحية `admin` في جدول `Employees` قبل تسجيل الدخول إلى لوحة التحكم.

## الهيكل

- `backend/`: منطق البوت، واجهات API، وقاعدة البيانات.
- `dashboard/`: لوحة الإدارة Vue/PWA.
- `functions/`: نقاط دخول Cloudflare Pages Functions.
- `schema.sql`: مخطط قاعدة البيانات.
- `wrangler.toml`: إعدادات Cloudflare وD1.

## ملاحظات

أي تغيير على قاعدة البيانات يجب أن يبدأ بتحديث `schema.sql` ومراجعته، ثم تطبيقه على قاعدة D1 المستضافة. استخدم فرعًا منفصلًا لكل تعديل وراجعه قبل دمجه في `main`.
