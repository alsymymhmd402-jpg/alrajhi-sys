import { describe, expect, it } from "vitest";
import { getAcceptanceStatus, getRequestAcceptanceStatus } from "./clientAcceptance";

describe("نظام قبول العميل", () => {
  it("يعرض حالة الاستلام أو المراجعة أو إغلاق المتابعة بلا ادعاء قبول نهائي", () => {
    expect(getAcceptanceStatus("open")).toMatchObject({ index: 0, title: "تم استلام طلبك" });
    expect(getAcceptanceStatus("in_progress")).toMatchObject({ index: 1, title: "طلبك قيد المراجعة" });
    expect(getAcceptanceStatus("closed")).toMatchObject({ index: 2, title: "اكتملت متابعة الطلب" });
  });

  it("يعكس حالات الطلب المحفوظة بما فيها الانتظار والإنجاز والإغلاق", () => {
    expect(getRequestAcceptanceStatus("new")).toMatchObject({ index: 0, title: "تم استلام طلبك" });
    expect(getRequestAcceptanceStatus("waiting")).toMatchObject({ index: 1, title: "طلبك بانتظار متابعة" });
    expect(getRequestAcceptanceStatus("completed")).toMatchObject({ index: 2, title: "اكتملت معالجة طلبك" });
    expect(getRequestAcceptanceStatus("closed")).toMatchObject({ index: 2, title: "أُغلق الطلب" });
  });
});
