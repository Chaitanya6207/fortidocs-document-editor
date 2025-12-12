// backend/services/email.js
const nodemailer = require('nodemailer');

async function sendShareEmail(toEmail, cid, ownerName) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured; skipping email send');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const info = await transporter.sendMail({
    from: `"FortiDocs" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${ownerName} shared a file with you`,
    text: `A file was shared: ${ipfsUrl}`,
    html: `<p>${ownerName} shared a file. <a href="${ipfsUrl}">Open file</a></p>`
  });

  return info;
}

module.exports = { sendShareEmail };
