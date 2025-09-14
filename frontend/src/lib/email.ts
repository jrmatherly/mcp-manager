import { Resend } from "resend";
import { env } from "../env";

// Initialize Resend with API key or placeholder for development
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendEmail = async (payload: { to: string; subject: string; text: string }) => {
  // If no Resend API key, log to console in development
  if (!resend) {
    if (env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("📧 Email (dev mode):", payload);
      return true; // Simulate success in development
    }
    // eslint-disable-next-line no-console
    console.error("Resend API key not configured");
    return false;
  }

  try {
    const response = await resend.emails.send({
      from: "MatherlyNet <no-reply@matherly.net>",
      ...payload,
    });

    // Email sent successfully
    if (response?.data) {
      return true;
    }
    return false;
  } catch {
    // Error sending email
    return false;
  }
};
