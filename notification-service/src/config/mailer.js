const nodemailer = require('nodemailer');
const env = require('./env');

// Gmail SMTP qua App Password — đơn giản, không cần hạ tầng mail riêng cho quy mô đồ án.
// Lưu ý: KHÔNG bao giờ hard-code username/password ở đây, luôn lấy từ biến môi trường
// (đưa vào docker-compose.yml giống cách JWT_ACCESS_SECRET/VNPAY_HASH_SECRET đang được quản lý).
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.mail.username,
        pass: env.mail.password,
    },
});

async function sendMail({ to, subject, html }) {
    console.log(`[Mail] Đang gửi email tới "${to}" — chủ đề: "${subject}"`);
    const info = await transporter.sendMail({
        from: `"${env.mail.fromName}" <${env.mail.username}>`,
        to,
        subject,
        html,
    });
    console.log(`[Mail] Gửi thành công tới "${to}" — messageId=${info.messageId}`);
    return info;
}

module.exports = { sendMail };
