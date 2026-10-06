import { afterEach, expect, it, vi } from "vitest";
import { sendContactEmail } from "./contact-email";
const email = {
  to: "seller@gms.tcu.edu.tw",
  replyTo: "buyer@gms.tcu.edu.tw",
  subject: "Test item",
  body: "Test message",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses mailto fallback when server email is disabled or incomplete", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  vi.stubEnv("SERVER_EMAIL_CONTACT", "false");
  expect(await sendContactEmail(email)).toBe(false);
  vi.stubEnv("SERVER_EMAIL_CONTACT", "true");
  vi.stubEnv("RESEND_API_KEY", "");
  expect(await sendContactEmail(email)).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it("sends Reply-To correctly and falls back on rejection or network failure", async () => {
  vi.stubEnv("SERVER_EMAIL_CONTACT", "true");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("CONTACT_FROM_EMAIL", "market@example.test");
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 500 }))
    .mockRejectedValueOnce(new Error("Offline"));
  vi.stubGlobal("fetch", fetch);
  expect(await sendContactEmail(email)).toBe(true);
  expect(JSON.parse(fetch.mock.calls[0][1].body).reply_to).toBe(email.replyTo);
  expect(await sendContactEmail(email)).toBe(false);
  expect(await sendContactEmail(email)).toBe(false);
});
