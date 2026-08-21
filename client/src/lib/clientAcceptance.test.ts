import { describe, expect, it } from "vitest";
import { getAcceptanceStatus } from "./clientAcceptance";

describe("نظام قبول العميل", () => {
  it("يعرض حالة الاستلام أو المراجعة أو إغلاق المتابعة بلا ادعاء قبول نهائي", () => {
    expect(getAcceptanceStatus("open")).toMatchObject({ index: 0, title: "تم استلام طلبك" });
    expect(getAcceptanceStatus("in_progress")).toMatchObject({ index: 1, title: "طلبك قيد المراجعة" });
    expect(getAcceptanceStatus("closed")).toMatchObject({ index: 2, title: "اكتملت متابعة الطلب" });
  });
});
