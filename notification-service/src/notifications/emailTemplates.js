function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
}

function wrap(title, bodyHtml) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
            <h2 style="color: #111827;">${title}</h2>
            ${bodyHtml}
            <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
                Đây là email tự động từ TTTN Shop, vui lòng không trả lời email này.
            </p>
        </div>
    `;
}

function welcome({ fullName }) {
    return {
        subject: 'Chào mừng bạn đến với TTTN Shop',
        html: wrap('Chào mừng bạn!', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại TTTN Shop. Chúc bạn có những trải nghiệm mua sắm thật tuyệt vời!</p>
        `),
    };
}

function orderCreated({ orderCode, totalAmount, recipientName }) {
    return {
        subject: `Xác nhận đơn hàng ${orderCode}`,
        html: wrap('Đặt hàng thành công', `
            <p>Xin chào <strong>${recipientName}</strong>,</p>
            <p>Chúng tôi đã nhận được đơn hàng <strong>${orderCode}</strong> của bạn với tổng giá trị <strong>${formatCurrency(totalAmount)}</strong>.</p>
            <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý và giao đi.</p>
        `),
    };
}

function orderCancelled({ orderCode, fullName }) {
    return {
        subject: `Đơn hàng ${orderCode} đã bị hủy`,
        html: wrap('Đơn hàng đã hủy', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Đơn hàng <strong>${orderCode}</strong> của bạn đã được hủy. Nếu bạn đã thanh toán, khoản tiền sẽ được hoàn lại theo chính sách của chúng tôi.</p>
        `),
    };
}

function orderCompleted({ orderCode, fullName }) {
    return {
        subject: `Đơn hàng ${orderCode} đã hoàn tất`,
        html: wrap('Cảm ơn bạn đã mua sắm!', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Đơn hàng <strong>${orderCode}</strong> đã được giao thành công và hoàn tất. Cảm ơn bạn đã tin tưởng và mua sắm tại TTTN Shop!</p>
        `),
    };
}

function paymentSucceeded({ orderCode, amount, fullName }) {
    return {
        subject: `Thanh toán thành công cho đơn hàng ${orderCode}`,
        html: wrap('Thanh toán thành công', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi đã nhận được khoản thanh toán <strong>${formatCurrency(amount)}</strong> cho đơn hàng <strong>${orderCode}</strong>.</p>
            <p>Đơn hàng của bạn sẽ sớm được xử lý và giao đi.</p>
        `),
    };
}

const SHIPMENT_STATUS_LABELS = {
    picked_up: 'Đơn vị vận chuyển đã lấy hàng',
    delivered: 'Đã giao hàng thành công',
    failed: 'Giao hàng không thành công',
};

function shipmentStatusChanged({ orderCode, fullName, carrier, trackingCode, status }) {
    const label = SHIPMENT_STATUS_LABELS[status] || status;
    return {
        subject: `Cập nhật vận chuyển đơn hàng ${orderCode}: ${label}`,
        html: wrap('Cập nhật vận chuyển', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Đơn hàng <strong>${orderCode}</strong> (vận chuyển bởi <strong>${carrier}</strong>, mã vận đơn <strong>${trackingCode}</strong>) vừa có cập nhật mới:</p>
            <p style="font-size: 16px;"><strong>${label}</strong></p>
        `),
    };
}

function passwordReset({ fullName, resetUrl }) {
    return {
        subject: 'Đặt lại mật khẩu TTTN Shop',
        html: wrap('Đặt lại mật khẩu', `
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p style="margin: 24px 0;">
                <a href="${resetUrl}" style="background:#111827;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Đặt lại mật khẩu
                </a>
            </p>
            <p style="font-size:13px;color:#6b7280;">Link có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        `),
    };
}

module.exports = {
    welcome,
    orderCreated,
    orderCancelled,
    orderCompleted,
    paymentSucceeded,
    shipmentStatusChanged,
    passwordReset,
};
