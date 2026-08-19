import { MissedCallNotice } from "@/components/MissedCallNotice";
import { useState } from "react";

export default function MissedCallPreview() {
  const [guestVisible, setGuestVisible] = useState(true);
  const [ownerVisible, setOwnerVisible] = useState(true);
  return <main className="min-h-screen bg-blue-50 p-8" dir="rtl"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-xl shadow-blue-100"><p className="text-sm font-semibold text-blue-700">معاينة تطويرية</p><h1 className="mt-2 text-2xl font-bold text-slate-950">حالة المكالمات الفائتة</h1><p className="mt-3 text-sm leading-7 text-slate-600">تعرض هذه الصفحة مكوّن النتيجة نفسه المستخدم بعد انتهاء مهلة مكالمة واردة غير مُجابة.</p></section>{guestVisible && <MissedCallNotice recipient="guest" onClose={() => setGuestVisible(false)} />}{ownerVisible && <MissedCallNotice recipient="owner" placement="owner" onClose={() => setOwnerVisible(false)} />}</main>;
}
