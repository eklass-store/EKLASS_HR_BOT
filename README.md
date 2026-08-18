# Challengawy HR BOT

نظام موارد بشرية متكامل لمؤسسة واحدة، يجمع بين بوت Telegram للموظفين ولوحة تحكم إدارية تعمل كتطبيق PWA.  
المشروع مهيأ للإنتاج على Cloudflare Pages + Pages Functions + D1، مع حسابات مديرين متعددة، تقارير Excel، سجل تدقيق، وحماية دخول عبر Telegram Login Widget.

> **نطاق النظام:** نسخة واحدة لمؤسسة واحدة، وبوت Telegram واحد، وقاعدة D1 واحدة. لا توجد طبقة Multi-tenant أو عزل بين شركات.

## المزايا

### للموظفين عبر Telegram

- تسجيل الحضور والانصراف.
- طلب الإجازات ومتابعة حالتها.
- طلب السلف ومتابعة الموافقة والرصيد المتبقي.
- الاطلاع على الراتب والتأكيد على الاستلام.
- استقبال التعميمات والرسائل من الإدارة.
- حفظ حالة المحادثات متعددة الخطوات حتى تكتمل العملية.

### للمديرين عبر لوحة التحكم

- إدارة الموظفين والأقسام والأدوار.
- دعم أكثر من مدير نشط في نفس النظام.
- مراجعة واعتماد الإجازات والسلف.
- إدارة الرواتب والخصومات والإضافي.
- إدارة العطلات وإعدادات الدوام.
- إرسال رسائل فردية أو تعميمات.
- متابعة حالة Webhook.
- تصدير تقارير Excel.
- عرض سجل التدقيق والأخطاء مع صفحات وفلاتر وحذف دفعي مضبوط.

## المعمارية

| الجزء | التقنية | المسار |
|---|---|---|
| الواجهة | Vue 3 + Vite + TypeScript + Tailwind + PWA | `dashboard/` |
| API | Cloudflare Pages Functions | `functions/api/` |
| منطق البوت | grammY + Telegram Bot API | `backend/handlers/` و`backend/webhook.ts` |
| المصادقة | Telegram HMAC + JWT | `backend/api/routes.ts` |
| قاعدة البيانات | Cloudflare D1 / SQLite | `schema.sql` |
| التقارير | ExcelJS | `backend/api/export.ts` |
| الإعدادات | Wrangler | `wrangler.toml` |

## المتطلبات

- Node.js 20 أو أحدث.
- حساب Cloudflare مع Pages وD1.
- بوت Telegram منشأ من [@BotFather](https://t.me/BotFather).
- صلاحية ربط مستودع GitHub بحساب Cloudflare.
- قاعدة D1 باسم `hr-system-db` أو اسم مطابق لإعداداتك.

## التشغيل المحلي

### 1. تثبيت الاعتماديات

من جذر المشروع:

```bash
npm install
```

يقوم أمر البناء بتثبيت اعتماديات لوحة التحكم تلقائياً داخل `dashboard/`.

### 2. إعداد المتغيرات المحلية

أنشئ ملفاً باسم `.dev.vars` في جذر المشروع، ولا ترفعه إلى Git:

```dotenv
BOT_TOKEN=123456:replace-with-real-token
JWT_SECRET=replace-with-a-long-random-secret
WEBHOOK_SECRET=replace-with-random-webhook-secret
API_KEY=
INITIAL_ADMIN_ID=123456789
ALLOWED_ORIGIN=http://localhost:8788
TIMEZONE=Africa/Cairo
VITE_BOT_USERNAME=your_bot_username
```

> `VITE_BOT_USERNAME` يُستخدم أثناء بناء الواجهة. في Cloudflare Pages يجب ضبطه ضمن متغيرات بيئة الإنتاج ثم إعادة البناء.

### 3. إنشاء قاعدة البيانات

لإنشاء الجداول على قاعدة D1 البعيدة:

```bash
npx wrangler d1 execute hr-system-db --remote --file=./schema.sql
```

للتجربة المحلية يمكن استخدام:

```bash
npx wrangler d1 execute hr-system-db --local --file=./schema.sql
```

لا تعيد تطبيق `schema.sql` على قاعدة إنتاج تحتوي بيانات إلا بعد أخذ نسخة احتياطية ومراجعة أي Migration مطلوب.

### 4. البناء والتشغيل

```bash
npm run build
npm run dev
```

بعد التشغيل افتح الرابط الذي يعرضه Wrangler. مسار الـ API المحلي يكون تحت `/api`.

## متغيرات التشغيل

| المتغير | النوع | مطلوب | الغرض |
|---|---|---:|---|
| `BOT_TOKEN` | Secret | نعم | توكن Telegram والتحقق من توقيع Login Widget |
| `JWT_SECRET` | Secret | نعم | توقيع جلسات لوحة التحكم |
| `WEBHOOK_SECRET` | Secret | موصى به | حماية طلبات Telegram Webhook |
| `VITE_BOT_USERNAME` | Build variable | نعم للـ Widget | اسم المستخدم الحقيقي للبوت بدون `@` |
| `ALLOWED_ORIGIN` | Plain text | نعم للإنتاج | نطاق لوحة التحكم المسموح به في CORS |
| `TIMEZONE` | Plain text | موصى به | المنطقة الزمنية، والقيمة الحالية `Africa/Cairo` |
| `API_KEY` | Secret | اختياري | وصول برمجي بديل عن JWT |
| `INITIAL_ADMIN_ID` | Plain text/Secret | اختياري | Telegram ID لأول مدير فقط إذا لم يوجد أي مدير في قاعدة البيانات |

### قواعد مهمة للمتغيرات

- لا تضع الأسرار في `wrangler.toml` أو GitHub أو ملفات الواجهة.
- استخدم نفس `BOT_TOKEN` في Telegram وCloudflare.
- يجب أن تكون قيمة `ALLOWED_ORIGIN` بدون شرطة مائلة في النهاية، مثال:
  `https://challengawy-hr.pages.dev`.
- بعد تغيير `VITE_BOT_USERNAME` يجب إعادة النشر لأن القيمة تدخل في ملفات الواجهة أثناء البناء.

## إعداد Cloudflare Pages

### الإعدادات الصحيحة للمشروع

- **Project:** `challengawy-hr`
- **Production branch:** `main`
- **Root directory:** فارغ
- **Build command:** `npm run build`
- **Build output directory:** `dashboard/dist`
- **D1 binding:** `DB`
- **D1 database:** `hr-system-db`

### النشر التلقائي

اربط مشروع Pages بمستودع GitHub ثم اختر الفرع `main`. كل دمج على `main` سيبدأ بناءً جديداً.

### النشر اليدوي

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dashboard/dist --project-name challengawy-hr
```

## إعداد Telegram Login وWebhook

1. من BotFather نفّذ:
   - `/setdomain`
   - أدخل: `challengawy-hr.pages.dev`
2. اضبط `VITE_BOT_USERNAME` على اسم البوت الحقيقي.
3. اضبط `BOT_TOKEN` و`JWT_SECRET` و`WEBHOOK_SECRET` في Cloudflare.
4. افتح لوحة التحكم وسجّل الدخول.
5. استخدم إعداد Webhook أو استدعِ:
   `POST /api/set-webhook` بعد المصادقة.
6. تحقق من:
   `GET /api/webhook-info`.

نقطة استقبال Telegram هي:

```
https://challengawy-hr.pages.dev/api/webhook
```

## قاعدة البيانات والبيانات التاريخية

الجداول الرئيسية:

- `Employees`: الموظفون والأدوار والحالة.
- `Departments`: الأقسام.
- `Attendance`: الحضور والانصراف.
- `Leaves`: الإجازات.
- `Loans`: السلف والأرصدة المتبقية.
- `Payroll`: الرواتب الشهرية.
- `Announcements`: التعميمات.
- `ConversationState`: حالة المحادثات.
- `AuthNonces`: منع إعادة استخدام Telegram Login.
- `AuditLogs`: الإجراءات الإدارية والأخطاء.
- `Holidays`: العطلات والأيام المستثناة.
- `Settings`: أوقات الدوام وقواعد الخصم والإضافي.

### حذف الموظف

الحذف من لوحة الإدارة **تعطيل ناعم**: تتحول قيمة `is_active` إلى `0` وتبقى بيانات الحضور والرواتب والإجازات محفوظة.

### حذف سجل التدقيق

حذف سجل من `AuditLogs` لا يحذف موظفاً أو راتباً أو حضوراً. لكنه يفقد الدليل التاريخي للسجل المحذوف، لذلك يجب أخذ نسخة D1 قبل الحذف. عملية الحذف نفسها تُسجل باسم المدير المنفذ عندما تتم من الواجهة.

## التقارير

### تقرير الموظفين

يتضمن:

- رقم الموظف وTelegram ID.
- الاسم والقسم والدور.
- الراتب الأساسي.
- الحالة وتاريخ التسجيل.

### التقرير الشهري

يتضمن:

- الراتب الأساسي.
- الإضافي.
- إجمالي الخصومات.
- صافي الراتب.
- حالة إصدار الراتب.
- حالة تأكيد الاستلام وتوقيتها.

### التقرير الشامل

يتضمن للفترة المحددة:

- أيام الحضور.
- دقائق التأخير وقيمة الخصم.
- دقائق العمل الإضافي وقيمته.
- السلف النشطة.
- قيمة السلفة المخصومة.
- صافي الراتب.

يدعم التقرير الشامل فترة داخل شهر ميلادي واحد لضمان اتساق حسابات الرواتب. التصدير محدود حالياً إلى 5000 صف لكل نوع تقرير، ويظهر تحذير داخل ملف Excel عند الوصول للحد.

## الأمن والتشغيل

- تسجيل الدخول يعتمد على Telegram HMAC ثم JWT.
- صلاحية JWT الحالية 24 ساعة.
- يتم منع إعادة استخدام نفس Telegram Login payload عبر `AuthNonces`.
- كل مدير نشط بدور `admin` يملك نفس الصلاحيات حالياً.
- أخطاء Webhook تسجل في سجل التدقيق مع رسالة مختصرة، بينما يعاد `200` إلى Telegram لتجنب إعادة إرسال التحديث بلا نهاية.
- فعّل WAF وRate Limiting من Cloudflare للإنتاج.
- لا تعرض `BOT_TOKEN` أو `JWT_SECRET` أو `WEBHOOK_SECRET` في السجلات أو لقطات الشاشة.

## الهيكل المختصر

```
backend/
  api/                 REST API والمصادقة والتصدير
  db/                  عمليات D1
  handlers/            أوامر ورسائل وCallbacks البوت
  keyboards/           لوحات Telegram
  utils/               الوقت والرواتب والتنسيق
  webhook.ts           نقطة تشغيل Telegram
dashboard/
  src/views/           شاشات لوحة التحكم
  src/stores/          حالة المصادقة
  src/api/             عميل API
functions/
  api/                 Pages Functions
schema.sql             مخطط D1
wrangler.toml          إعداد Cloudflare
task.md                سجل مراحل التنفيذ
audit_report.md        تقرير التدقيق والمخاطر
```

## التحقق قبل كل إصدار

```bash
npm run build
```

ثم راجع:

1. عدم وجود أسرار في Git.
2. صحة `BOT_TOKEN` و`JWT_SECRET`.
3. صحة `ALLOWED_ORIGIN`.
4. نجاح بناء Cloudflare ووصوله إلى `dashboard/dist`.
5. نجاح `/api/webhook-info`.
6. تجربة تسجيل الدخول ومدير نشط واحد على الأقل.
7. تجربة تقرير Excel وسجل التدقيق.

## سياسة التعديلات

- كل تعديل مستقل يُسجل كتاسك في `task.md`.
- لا تعدل قاعدة الإنتاج مباشرة دون نسخة احتياطية.
- استخدم فرعاً منفصلاً وراجع الفروقات قبل الدمج في `main`.
- وثّق أي تغيير في المتغيرات أو مخطط البيانات داخل Pull Request.

## الترخيص

هذا المشروع مخصص لتشغيل Challengawy HR للمؤسسة المالكة. أضف نص الترخيص القانوني المناسب قبل توزيعه خارج نطاق المؤسسة.
