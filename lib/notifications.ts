/**
 * Notifications Helper (LINE Messaging API + Email)
 */

export async function sendLineNotification(
  lineUserId: string,
  message: string
): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || token === "your-line-channel-access-token") {
    console.warn("[LINE Notification] Token not configured in .env.local");
    return false;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[LINE Notification Error] Status: ${res.status}, Body: ${errBody}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[LINE Notification Exception]:", err);
    return false;
  }
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  bodyHtml: string
): Promise<boolean> {
  // Supabase SMTP or Webhook Email Notification
  console.log(`[Email Notification Queue] To: ${to}, Subject: ${subject}, Content Length: ${bodyHtml?.length || 0}`);
  return true;
}
