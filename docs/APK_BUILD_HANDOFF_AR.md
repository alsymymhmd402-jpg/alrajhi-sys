# وثيقة تسليم مشروع تحويل موقع خدمة العملاء إلى APK

> هذه الوثيقة هي المرجع الأساسي لأي مطوّر أو وكيل ذكاء اصطناعي يكمل العمل. يجب قراءتها قبل تعديل أو إعادة بناء أي APK.

## 1. الهدف النهائي

تحويل موقع خدمة العملاء الموجود في هذا المستودع إلى ملف **Android APK** يعمل دون انهيار، مع الحفاظ على الموقع كما هو:

- نفس الواجهات الأصلية.
- نفس الألوان والخلفيات والعلامة المائية.
- نفس الأيقونات والأحجام والمسافات والتشكيل.
- نفس الصفحات والتنقل ونظام المراسلة.
- نفس API والخادم والاتصال اللحظي.
- لا توجد معاينات تخطيطية بديلة.
- لا توجد واجهات مختصرة أو إعادة تصميم من الصفر.
- يجب اختبار APK فعليًا على جهاز Android أو محاكي قبل وصفه بأنه جاهز.

## 2. المستودع والمشروع الأصلي

- المستودع: `alsymymhmd402-jpg/alrajhi-sys`
- المسار المحلي: `/home/ubuntu/alrajhi-sys`
- الخادم/الموقع: `https://voicecall-uwxhmyez.manus.space`
- بداية تطبيق العميل في الموقع: `https://voicecall-uwxhmyez.manus.space/client/start`
- رابط موقع المؤسسة داخل التطبيق: `https://alwaleedphilanthropies.org/ar?hl=ar-YE`

## 3. أهم مسارات الموقع الأصلي

### صفحات العميل

- `client/src/pages/ClientMessages.tsx` — قائمة قنوات خدمة العملاء.
- `client/src/pages/ClientInstitution.tsx` — صفحة المؤسسة والنبذة والموقع.
- `client/src/pages/ClientProfile.tsx` — ملف العميل.
- `client/src/pages/ClientApplication.tsx` — القبول والمتابعة.
- `client/src/components/InstitutionChat.tsx` — نظام المراسلة الكامل.
- `client/src/pages/GuestChat.tsx` — محادثة العميل.
- `client/src/components/ClientBottomNav.tsx` — شريط التنقل السفلي.
- `client/src/lib/brandAssets.ts` — الأصول الأصلية.
- `client/src/lib/institutionPreload.ts` — رابط المؤسسة وآلية التحميل المسبق.
- `client/src/index.css` — الألوان والخلفيات العامة.

### API والاتصالات

- `server/routers/support.ts` — إنشاء المحادثة، المحادثات، الرسائل، الملف، الطلبات.
- `server/routers/calls.ts` — المكالمات.
- `server/realtime.ts` — Socket.IO والتحديث اللحظي.
- `docs/production_webrtc_requirements.md` — متطلبات WebRTC.
- `docs/production_voice_validation.md` — تحقق الاتصالات الصوتية.

## 4. إصدارات APK السابقة وما حدث فيها

### A. `external-deployment/client-native-app`

كان هذا مشروع Android Java يحاول إعادة رسم واجهات الموقع يدويًا. تم فيه بناء شاشات أصلية للمراسلة والعميل، لكن النتيجة لم تكن استنساخًا حرفيًا للموقع، لذلك **لا تعتبر هذه الواجهات المرجع النهائي**.

المشاكل التي ظهرت:

- اختلافات في الأحجام والخلفيات والأيقونات.
- تداخل النصوص في بعض النسخ.
- شاشة المراسلة لم تكن مطابقة للموقع.
- تم إصلاح بعض سلوكيات لوحة المفاتيح والفقاعات، لكنها بقيت إعادة بناء تقريبية.
- أضيف Socket.IO ثم أزيل من الغلاف النهائي المبسط لتقليل أسباب الانهيار.

النسخة الحالية داخل هذا المسار أصبحت غلاف WebView Android بسيطًا في:

`external-deployment/client-native-app/app/src/main/java/org/alwaleed/customer/MainActivity.java`

هذا الغلاف يفتح الموقع الفعلي داخل WebView، وليس واجهة Java مرسومة يدويًا.

### B. `external-deployment/client-app`

هذا مشروع Capacitor كان يفتح الموقع عبر `server.url`:

```text
https://voicecall-uwxhmyez.manus.space/client/start
```

تمت محاولة بناء Release منه، لكن المستخدم أبلغ عن Crash عند الفتح. أزيلت إضافة Social Login لأنها غير مطلوبة لتطبيق العميل وقد تكون سببًا محتملًا، لكن لم يتوفر جهاز Android أو logcat داخل بيئة البناء لتحديد Stack Trace فعلي. لذلك لا تستخدم نسخة Capacitor القديمة باعتبارها مستقرة.

## 5. سبب اعتماد الغلاف المبسط الحالي

بما أن المطلوب هو **نفس الموقع دون اختصار أو إعادة تصميم**، فإن إعادة رسم الموقع يدويًا في Java تخالف المطلوب. الغلاف الصحيح للحفاظ على التطابق هو:

1. تطبيق Android أصلي صغير.
2. WebView مضبوط بشكل آمن.
3. تحميل رابط الموقع الفعلي نفسه.
4. تفعيل JavaScript وDOM Storage والكوكيز والتخزين المؤقت.
5. دعم الرجوع داخل صفحات الموقع.
6. معالجة تعطل WebView وإعادة إنشاء Activity بدل انهيار التطبيق.
7. عدم استخدام Capacitor أو إضافات Social Login غير اللازمة.

هذا يحقق تطابق الموقع، بينما تبقى الوظائف نفسها في الخادم الأصلي.

## 6. النسخة الحالية التي تم بناؤها

المشروع الحالي:

```text
/home/ubuntu/alrajhi-sys/external-deployment/client-native-app
```

نقطة التشغيل الحالية:

```text
external-deployment/client-native-app/app/src/main/java/org/alwaleed/customer/MainActivity.java
```

خصائص النسخة:

- `applicationId`: `org.alwaleed.customer.siteapk`
- `versionCode`: `5`
- `versionName`: `5.0.0`
- `minSdk`: 21
- `targetSdk`: 35
- رابط البداية: `https://voicecall-uwxhmyez.manus.space/client/start`
- WebView يدعم JavaScript وDOM Storage والكوكيز والتخزين المؤقت.
- معالجة `onRenderProcessGone` وإعادة تشغيل الواجهة.
- حفظ حالة WebView عند إعادة إنشاء Activity.
- زر الرجوع يرجع داخل الموقع قبل الخروج من التطبيق.

ملف APK الناتج محليًا:

```text
/home/ubuntu/alrajhi-sys/external-deployment/client-native-app/app/build/outputs/apk/release/alwaleed-customer-site-stable-v5.apk
```

SHA-256 للنسخة التي تم رفعها:

```text
7d55fc8aeb9024ed424393e3719b37ac53cb63fdd2186eeea12cf368bb9d6f25
```

رابط التنزيل الحالي:

```text
https://files.manuscdn.com/user_upload_by_module/session_file/310519663996640306/VPdnNGSnWlkvNxxp.apk
```

> تم التحقق من zipalign ومن توقيعات Android V1 وV2 وV3، وتمت مقارنة SHA-256 للملف المحلي والملف الذي تم تنزيله من CDN.

## 7. طريقة إعادة البناء

```bash
cd /home/ubuntu/alrajhi-sys/external-deployment/client-native-app
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export ANDROID_SDK_ROOT=/home/ubuntu/android-sdk
./gradlew clean assembleRelease --no-daemon --max-workers=1
```

ثم المحاذاة والتوقيع:

```bash
UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
ALIGNED=app/build/outputs/apk/release/app-release-aligned.apk
SIGNED=app/build/outputs/apk/release/alwaleed-customer-site-stable-v5.apk

/home/ubuntu/android-sdk/build-tools/35.0.0/zipalign -f -p 4 "$UNSIGNED" "$ALIGNED"
/home/ubuntu/android-sdk/build-tools/35.0.0/apksigner sign \
  --ks /home/ubuntu/.android/customer-release.jks \
  --ks-pass pass:'<كلمة المرور المحلية الموجودة في بيئة البناء>' \
  --key-pass pass:'<كلمة المرور المحلية الموجودة في بيئة البناء>' \
  --ks-key-alias customer_release \
  --min-sdk-version 21 \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$SIGNED" "$ALIGNED"

/home/ubuntu/android-sdk/build-tools/35.0.0/zipalign -c -v 4 "$SIGNED"
/home/ubuntu/android-sdk/build-tools/35.0.0/apksigner verify --verbose "$SIGNED"
```

لا تحفظ كلمة مرور keystore في Git أو داخل هذه الوثيقة.

## 8. الاختبار الإلزامي قبل التسليم

لا يكفي نجاح Gradle أو صحة التوقيع. يجب قبل تسليم APK:

1. تثبيت APK على جهاز Android أو محاكي حقيقي.
2. فتح التطبيق من Launcher.
3. التأكد من عدم ظهور Crash عند أول تشغيل.
4. فتح رابط الدعوة والدخول إلى شاشة العميل.
5. اختبار كل الصفحات:
   - المراسلة.
   - المؤسسة.
   - ملفي.
   - القبول والمتابعة.
6. إرسال رسالة واستقبال رسالة.
7. اختبار لوحة المفاتيح وعدم تغطية شريط الكتابة.
8. الخروج وإعادة فتح التطبيق والتأكد من بقاء الجلسة.
9. اختبار زر الرجوع.
10. اختبار فتح موقع المؤسسة داخل التطبيق.
11. استخراج logcat أثناء التشغيل:

```bash
adb logcat -c
adb shell monkey -p org.alwaleed.customer.siteapk 1
adb logcat -d -v threadtime > /tmp/customer-apk-logcat.txt
rg -n "FATAL EXCEPTION|AndroidRuntime|WebView|chromium|Crash" /tmp/customer-apk-logcat.txt
```

إذا لم يتوفر جهاز أو محاكي، يجب قول ذلك صراحة وعدم الادعاء بأن APK اختُبر تشغيله فعليًا.

## 9. الخطة الصحيحة لإكمال العمل

### المرحلة الأولى: تثبيت التشغيل

- اختبار الغلاف WebView الحالي على جهاز Android.
- الحصول على logcat عند أي Crash.
- إصلاح السبب المحدد، لا التخمين.
- عدم إضافة Capacitor أو إضافات تسجيل دخول لا يحتاجها العميل.

### المرحلة الثانية: التطابق

- استخدام الموقع الفعلي داخل APK بدل إعادة رسم الصفحات يدويًا.
- عدم إنشاء صور معاينة بديلة باعتبارها واجهة نهائية.
- عدم تغيير CSS أو النصوص أو الأيقونات.
- التأكد من أن الرابط يفتح `/client/start` نفسه.

### المرحلة الثالثة: الاتصالات

- ترك الرسائل وSocket.IO وAPI تعمل من الموقع والخادم الأصلي.
- التحقق من صلاحيات الميكروفون والكاميرا فقط إذا كانت صفحة الاتصال تطلبها.
- عدم الادعاء بأن WebRTC يعمل دون TURN/ICE صالح في الخادم.

### المرحلة الرابعة: التخزين

- حفظ Cookies وDOM Storage وWebView state.
- استخدام CacheMode الافتراضي للموارد التي تم تحميلها.
- تذكر أن إرسال الرسائل واستقبالها يحتاج اتصالًا بالخادم.
- لا يمكن ضمان نسخة كاملة من الموقع دون اتصال إلا إذا تم بناء Service Worker/Offline bundle خاص بالموقع.

## 10. تعليمات مهمة للوكيل التالي

- لا تستخدم المعاينات الثابتة كدليل على أن APK مطابق.
- لا تعِد المستخدم بوجود اختبار جهاز إذا لم يوجد logcat أو جهاز فعلي.
- لا تختصر نظام المراسلة.
- لا تعيد كتابة صفحات Java يدويًا إذا كان المطلوب تطابق الموقع.
- لا تغيّر رابط الخادم أو API دون توثيق.
- لا تغيّر `applicationId` بعد نشر نسخة إلا عند الضرورة.
- ارفع `versionCode` في كل إصدار تحديث.
- احتفظ بكل APK في مسار واضح مع SHA-256.
- أي خطأ Crash يجب تشخيصه من logcat، وليس علاجه بالتخمين.
