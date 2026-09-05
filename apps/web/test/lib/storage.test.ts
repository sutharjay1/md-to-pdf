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
  expect(loadPrefs()).toEqual({ theme: "light", page: "A4" });
  savePrefs({ theme: "dark" });
  expect(loadPrefs()).toEqual({ theme: "dark", page: "A4" });
  savePrefs({ page: "Letter" });
  expect(loadPrefs()).toEqual({ theme: "dark", page: "Letter" });
});

it("ignores invalid stored values", () => {
  localStorage.setItem("md2pdf:page", "Tabloid");
  expect(loadPrefs().page).toBe("A4");
});

it("swallows storage failures", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(() => saveDoc("x")).not.toThrow();
});
