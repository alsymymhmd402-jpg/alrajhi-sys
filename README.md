# نظام الراجحي — منصة خدمة العملاء

منصة عربية RTL للتواصل بين المستفيدين وفريق المؤسسة، مع غرفة عمليات إدارية، محادثات لحظية، مكالمات WebRTC، ردود ذكاء اصطناعي اختيارية، وتطبيقَي Android منفصلين مبنيين باستخدام Capacitor.

## الروابط العامة

| العنصر | الرابط |
|---|---|
| الموقع المنشور | https://voicecall-uwxhmyez.manus.space |
| بوابة العميل | https://voicecall-uwxhmyez.manus.space/client/start |
| مستودع GitHub | https://github.com/alsymymhmd402-jpg/alrajhi-sys |
| تطبيق العميل | `org.alwaleed.customer` |
| غرفة العمليات | `org.alwaleed.operations` |

## بنية المشروع

يوجد كود الواجهة في `client/`، وكود الخادم وإجراءات tRPC في `server/`، ومخطط قاعدة البيانات في `drizzle/`. توجد إعدادات غلاف تطبيق العميل وغرفة العمليات تحت `external-deployment/`. لا تُرفع مجلدات `node_modules` أو مخرجات Gradle أو ملفات البيئة إلى هذا المستودع.

## التشغيل المحلي

استخدم Node.js 22 وpnpm. بعد توفير متغيرات البيئة في بيئة محلية آمنة، نفّذ:

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

## بناء تطبيق العميل

```bash
cd external-deployment/client-app
pnpm install
pnpm exec cap sync android
cd android
./gradlew assembleDebug --no-daemon --max-workers=1
```

ينتج الملف في `android/app/build/outputs/apk/debug/app-debug.apk`. غرفة العمليات لها غلاف مستقل تحت `external-deployment/owner-app/`.

## المصادقة والإعدادات

تسجيل Google مفعّل لتطبيق العميل فقط ويطلب رقم الهاتف أولاً. استخدم متغير `VITE_GOOGLE_CUSTOMER_WEB_CLIENT_ID` في إعدادات البيئة، ولا ترفع ملف OAuth JSON أو أي Client Secret. يجب حفظ `DATABASE_URL` و`JWT_SECRET` ومفاتيح مزودي الذكاء الاصطناعي والتخزين في مدير أسرار الاستضافة فقط.

## الأمان

هذا المستودع عام، لذلك لا تضع فيه كلمات مرور أو مفاتيح توقيع Android أو ملفات `.env` أو بيانات قاعدة البيانات أو ملفات OAuth. ملف Client ID العام ليس بديلاً عن حماية أسرار الخادم. راجع `docs/SETUP.md` قبل تشغيل نسخة جديدة.
