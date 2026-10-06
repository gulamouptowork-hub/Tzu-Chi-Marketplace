type ContactEmail = {
  to: string;
  replyTo: string;
  subject: string;
  body: string;
};
export async function sendContactEmail(email: ContactEmail): Promise<boolean> {
  if (
    process.env.SERVER_EMAIL_CONTACT !== "true" ||
    !process.env.RESEND_API_KEY ||
    !process.env.CONTACT_FROM_EMAIL
  )
    return false;
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.body,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return result.ok;
  } catch {
    return false;
  }
}
