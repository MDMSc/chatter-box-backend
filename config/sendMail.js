import nodemailer from "nodemailer";

export const sendMail = (mailDetails) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: "no-reply@chatterbox.com Chatter-Box Messenger",
    to: mailDetails.to,
    subject: mailDetails.subject,
    html: `<p>Hello ${mailDetails.body.name},<br /><br />
    
    Greetings!!!<br /><br />

    ${mailDetails.body.message}<br /><br />

    Your OTP is: <h2>${mailDetails.body.otp}</h2><br />

    <b>Note:</b> Kindly do not reply to this mail. This is an unattended email. No mails received to this email will be entertained.
    </p>
    `,
  };

  const mail = transporter
    .sendMail(mailOptions)
    .then((info) => {
      console.log(`Mail sent: ${info.response}`);
      return true;
    })
    .catch((error) => {
      console.log(error);
      return false;
    });

  return mail;
};
