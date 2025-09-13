import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (payload: { to: string; subject: string; text: string }) => {
  try {
    const response = await resend.emails.send({
      from: "Zexa Technologies <no-reply@zexa.app>",
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
