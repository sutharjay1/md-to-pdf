import { loadDoc, loadPrefs, saveDoc, savePrefs } from "@/lib/storage";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("round-trips the document", () => {
  expect(loadDoc()).toBeNull();
  saveDoc("# hi");
  expect(loadDoc()).toBe("# hi");
  expect(localStorage.getItem("md2pdf:doc")).toBe("# hi");
});

it("defaults prefs and merges partial saves", () => {
  expect(loadPrefs()).toEqual({ theme: "light", page: "A4", refs: "card", links: "link", syncScroll: true });
  savePrefs({ theme: "dark" });
  expect(loadPrefs()).toEqual({ theme: "dark", page: "A4", refs: "card", links: "link", syncScroll: true });
  savePrefs({ page: "Letter", refs: "link", links: "card", syncScroll: false });
  expect(loadPrefs()).toEqual({ theme: "dark", page: "Letter", refs: "link", links: "card", syncScroll: false });
});

it("ignores invalid stored values", () => {
  localStorage.setItem("md2pdf:page", "Tabloid");
  localStorage.setItem("md2pdf:refs", "embed");
  localStorage.setItem("md2pdf:links", "embed");
  expect(loadPrefs()).toMatchObject({ page: "A4", refs: "card", links: "link" });
});

it("swallows storage failures", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(() => saveDoc("x")).not.toThrow();
});
