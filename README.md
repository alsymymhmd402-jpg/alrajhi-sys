# نظام الراجحي — منصة خدمة العملاء

منصة عربية RTL للتواصل بين المستفيدين وفريق المؤسسة، مع غرفة عمليات إدارية، محادثات لحظية، مكالمات WebRTC، وردود ذكاء اصطناعي اختيارية. توجد وثيقة تسليم كاملة لتحويل بوابة العميل إلى APK في [`docs/APK_BUILD_HANDOFF_AR.md`](docs/APK_BUILD_HANDOFF_AR.md)، وملف حالة آلي في [`docs/apk-build-manifest.json`](docs/apk-build-manifest.json).

## الروابط العامة

| العنصر | الرابط |
|---|---|
| الموقع المنشور | https://voicecall-uwxhmyez.manus.space |
| بوابة العميل | https://voicecall-uwxhmyez.manus.space/client/start |
| مستودع GitHub | https://github.com/alsymymhmd402-jpg/alrajhi-sys |
| تطبيق العميل الحالي | `org.alwaleed.customer.siteapk` |
| غرفة العمليات | `org.alwaleed.operations` |

## بنية المشروع

يوجد كود الواجهة في `client/`، وكود الخادم وإجراءات tRPC في `server/`، ومخطط قاعدة البيانات في `drizzle/`. توجد إعدادات غلاف تطبيق العميل وغرفة العمليات تحت `external-deployment/`. لا تُرفع مجلدات `node_modules` أو مخرجات Gradle أو ملفات البيئة إلى هذا المستودع. الغلاف المرجعي الحالي للـAPK هو `external-deployment/client-native-app/`؛ أما `external-deployment/client-app/` فهو غلاف Capacitor سابق لا يُعتبر مستقرًا حتى يثبت تشغيله على جهاز Android مع logcat.

## التشغيل المحلي

استخدم Node.js 22 وpnpm. بعد توفير متغيرات البيئة في بيئة محلية آمنة، نفّذ:

```bash
pnpm install
pnpm check
pnpm test
pnpm dev
```

## بناء تطبيق العميل — المرجع الكامل

```bash
cd external-deployment/client-native-app
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_SDK_ROOT=/home/ubuntu/android-sdk
cd android
./gradlew assembleRelease --no-daemon --max-workers=1
```

ينتج ملف APK في `app/build/outputs/apk/release/`. يجب قراءة وثيقة التسليم قبل التوقيع أو التسليم، ويجب اختبار التشغيل على جهاز Android حقيقي أو محاكي مع logcat. غرفة العمليات لها غلاف مستقل تحت `external-deployment/owner-app/`.

## المصادقة والإعدادات

تسجيل Google مفعّل لتطبيق العميل فقط ويطلب رقم الهاتف أولاً. استخدم متغير `VITE_GOOGLE_CUSTOMER_WEB_CLIENT_ID` في إعدادات البيئة، ولا ترفع ملف OAuth JSON أو أي Client Secret. يجب حفظ `DATABASE_URL` و`JWT_SECRET` ومفاتيح مزودي الذكاء الاصطناعي والتخزين في مدير أسرار الاستضافة فقط.

## الأمان

هذا المستودع عام، لذلك لا تضع فيه كلمات مرور أو مفاتيح توقيع Android أو ملفات `.env` أو بيانات قاعدة البيانات أو ملفات OAuth. ملف Client ID العام ليس بديلاً عن حماية أسرار الخادم. راجع `docs/SETUP.md` قبل تشغيل نسخة جديدة.
