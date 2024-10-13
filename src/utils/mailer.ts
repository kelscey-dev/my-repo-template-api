import nodemailer from "nodemailer";

export default async function sendEmail(
  to: string[],
  subject: string,
  html: string
) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    return await transporter.sendMail({
      from: {
        name: "Swerteresita's Kitchen",
        address: `${process.env.SMTP_EMAIL}`,
      },
      to,
      subject,
      html,
    });
  } catch (err) {
    throw err;
  }
}
