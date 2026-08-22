import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectRoot = new URL("../../../", import.meta.url);
const readProjectFile = (path: string) => readFileSync(new URL(path, projectRoot), "utf8");

describe("عقد التخطيط الثابت لتطبيق العميل", () => {
  it("يقفل تمرير الصفحة ويعرّف منطقة محتوى مستقلة قابلة للتمرير", () => {
    const styles = readProjectFile("client/src/index.css");
    expect(styles).toContain("body:has(.client-viewport)");
    expect(styles).toContain("overflow: hidden;");
    expect(styles).toContain(".client-scroll-area");
    expect(styles).toContain("overflow-y: auto;");
  });

  it("يحافظ على هيدر ثابت بحاوية موحّدة فوق محتوى كل صفحة", () => {
    const styles = readProjectFile("client/src/index.css");
    expect(styles).toContain(".client-fixed-header");
    expect(styles).toContain("position: fixed;");
    expect(styles).toContain("z-index: 1000;");
    for (const page of ["components/InstitutionChat.tsx", "pages/ClientProfile.tsx", "pages/ClientInstitution.tsx", "pages/ClientApplication.tsx", "pages/ClientPrivacy.tsx"]) {
      expect(readProjectFile(`client/src/${page}`)).toContain("client-fixed-header");
    }
  });

  it("يثبت شريط كتابة المحادثة فوق تنقل العميل السفلي", () => {
    const chat = readProjectFile("client/src/components/InstitutionChat.tsx");
    const styles = readProjectFile("client/src/index.css");
    expect(chat).toContain("client-fixed-composer");
    expect(styles).toContain(".client-fixed-composer");
    expect(chat).toContain("bottom-[5.65rem]");
  });
});
