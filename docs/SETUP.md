# دليل إعداد وتشغيل نظام الراجحي

## المتطلبات

يتطلب المشروع Node.js 22 وpnpm وJava/Android SDK لبناء APK. يستخدم الموقع React وExpress وtRPC وDrizzle، بينما تستخدم حزم Android Capacitor 7.

## متغيرات البيئة

يجب إنشاء هذه القيم في مدير أسرار الاستضافة أو في ملف محلي غير متعقب. الأسماء العامة مثل `VITE_GOOGLE_CUSTOMER_WEB_CLIENT_ID` يمكن وضعها كإعداد بيئي عام، أما القيم التالية فتظل سرية: `DATABASE_URL` و`JWT_SECRET` و`BUILT_IN_FORGE_API_KEY` و`VITE_FRONTEND_FORGE_API_KEY` وأي مفاتيح مزودي الذكاء الاصطناعي أو التخزين.

لا ترفع إلى GitHub ملف `client_secret_*.json` أو `google-services.json` أو ملفات `.env` أو ملفات `.jks` و`.keystore`.

## اختبار الموقع

من جذر المشروع:

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

يفتح الموقع المحلي على المنفذ الذي يحدده المشروع، ولا ينبغي تثبيت رقم منفذ داخل كود الخادم.

## تطبيق العميل

المعرف هو `org.alwaleed.customer`. يفتح التطبيق بوابة العميل، ويستخدم شاشة افتتاح المؤسسة. يعتمد تسجيل Google على Client ID الويب الموجود في `VITE_GOOGLE_CUSTOMER_WEB_CLIENT_ID`، ويجب أن يطابق إعداد Google Cloud مع تطبيق Android وبصمة SHA-1 الخاصة بالإصدار.

```bash
cd external-deployment/client-app
pnpm install
pnpm exec cap sync android
cd android
./gradlew assembleDebug --no-daemon --max-workers=1
```

## غرفة العمليات

المعرف هو `org.alwaleed.operations`. هذا التطبيق مستقل عن تطبيق العميل ويفتح غرفة العمليات. لا تستخدم Client ID الخاص بالعميل داخل هذا التطبيق.

## الخدمات الخارجية

الموقع المنشور هو `https://voicecall-uwxhmyez.manus.space`. تخزين الصور والأصوات يتم عبر التخزين الدائم للمشروع. الاتصال اللحظي يعتمد Socket.io، والمكالمات تعتمد WebRTC؛ جودة الاتصال في الشبكات المقيدة قد تحتاج إعداد TURN إنتاجي. الرد الآلي يعتمد إعدادات الذكاء الاصطناعي المتاحة في بيئة الخادم، ولا يجب وضع مفاتيحها في الواجهة أو GitHub.

## النشر

ارفع الكود إلى مستودع GitHub ثم اربطه بمنصة الاستضافة. أضف الأسرار من لوحة إعدادات الاستضافة، وشغّل `pnpm check` و`pnpm test` قبل كل إصدار. ملفات APK Debug مناسبة للاختبار الداخلي؛ للنشر العام استخدم مفتاح Release محفوظاً خارج المستودع.
