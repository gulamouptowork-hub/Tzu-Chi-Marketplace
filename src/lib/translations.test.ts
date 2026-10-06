import { expect, it } from "vitest";
import en from "../../messages/en.json";
import zh from "../../messages/zh-TW.json";
function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value)
    .flatMap(([key, entry]) =>
      typeof entry === "object" && entry !== null
        ? keys(entry as Record<string, unknown>, prefix + key + ".")
        : [prefix + key],
    )
    .sort();
}
it("English and Traditional Chinese provide the same UI messages", () => {
  expect(keys(en)).toEqual(keys(zh));
});
