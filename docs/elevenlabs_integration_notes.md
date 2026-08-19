# ملاحظات تكامل ElevenLabs الصوتي

تؤكد وثائق ElevenLabs الرسمية أن مفتاح API لا يوضع في المتصفح مطلقاً. يستدعي الخادم نقطة التكامل الموثقة، ثم يعيد للعميل بيانات جلسة مؤقتة فقط. بالنسبة إلى اتصال WebSocket يمكن استخدام رابط موقّع من `GET /v1/convai/conversation/get-signed-url`، وينتهي الرابط الموقّع بعد 15 دقيقة. بالنسبة إلى الاتصال الصوتي عبر WebRTC، يستدعي الخادم نقطة رمز المحادثة ويرجع الرمز المؤقت للمتصفح؛ ثم يبدأ عميل ElevenLabs جلسة الصوت باستخدام هذا الرمز.

سيستخدم Voice Circle نهج WebRTC للوكيل الصوتي لأنه يتوافق مع مكالمة المتصفح وأذونات الميكروفون. ستبقى مفاتيح `ELEVENLABS_API_KEY` ومعرّف الوكيل في أسرار الخادم، بينما يجب أن يمر أي طلب جلسة من خلال تحقق رابط الدعوة وحالة المحادثة. يجب إعداد الوكيل في ElevenLabs بالمصادقة المناسبة، وإعداد نطاق النشر وفق نهج الحماية المختار.

## المراجع

1. [ElevenLabs – Agent authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication)
2. [ElevenLabs – Get signed URL](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-signed-url)
3. [ElevenLabs – JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script)
