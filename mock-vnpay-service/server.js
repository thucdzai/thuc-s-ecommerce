const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3001);
const HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'change_me_hash_secret';
const TMN_CODE = process.env.VNPAY_TMN_CODE || 'change_me_tmn_code';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3001';

// Replicates payment-service/src/utils/vnpay.js buildSignedQuery: sort keys
// alphabetically (excluding vnp_SecureHash / vnp_SecureHashType), join as
// encodeURIComponent(key)=encodeURIComponent(value)&..., HMAC-SHA512 hex digest.
function buildSignedQuery(params, hashSecret) {
  const keys = Object.keys(params)
    .filter((key) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort();

  const queryString = keys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const secureHash = crypto.createHmac('sha512', hashSecret).update(queryString).digest('hex');

  return { queryString, secureHash };
}

// Replicates formatVnpDate: current time in GMT+7, formatted yyyyMMddHHmmss
function formatVnpDate(date) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utcMs + 7 * 60 * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${vnTime.getFullYear()}${pad(vnTime.getMonth() + 1)}${pad(vnTime.getDate())}` +
    `${pad(vnTime.getHours())}${pad(vnTime.getMinutes())}${pad(vnTime.getSeconds())}`
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(vnpAmount) {
  const amount = Number(vnpAmount) / 100;
  return amount.toLocaleString('vi-VN') + ' VND';
}

function renderCheckoutPage(query) {
  const txnRef = query.vnp_TxnRef || '';
  const orderInfo = query.vnp_OrderInfo || '';
  const amount = query.vnp_Amount || '0';
  const returnUrl = query.vnp_ReturnUrl || '';

  const hiddenFields = Object.entries(query)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VNPAY Demo - Cổng thanh toán giả lập</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background: #eef1f5; margin: 0; padding: 0; }
    .topbar { background: #003b78; color: #fff; padding: 14px 24px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; }
    .topbar span { color: #ff7a00; }
    .wrapper { max-width: 480px; margin: 32px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
    .banner { background: #0066b3; color: #fff; padding: 16px 24px; }
    .banner h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .banner p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    .body { padding: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .row:last-of-type { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #111827; text-align: right; max-width: 60%; word-break: break-word; }
    .amount { color: #d8232a; font-size: 20px; }
    .notice { margin-top: 16px; padding: 12px; background: #fff7e6; border: 1px solid #ffe1a8; border-radius: 6px; font-size: 12px; color: #92600a; line-height: 1.5; }
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    button { flex: 1; padding: 12px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-success { background: #16a34a; color: #fff; }
    .btn-success:hover { background: #128a3e; }
    .btn-fail { background: #dc2626; color: #fff; }
    .btn-fail:hover { background: #b91c1c; }
  </style>
</head>
<body>
  <div class="topbar">VN<span>PAY</span> &mdash; Cổng thanh toán giả lập (mock, chỉ dùng để test cục bộ)</div>
  <div class="wrapper">
    <div class="banner">
      <h1>Xác nhận thanh toán</h1>
      <p>Đây KHÔNG phải VNPay thật &mdash; trang giả lập để kiểm thử luồng thanh toán nội bộ.</p>
    </div>
    <div class="body">
      <div class="row"><span class="label">Mã giao dịch (vnp_TxnRef)</span><span class="value">${escapeHtml(txnRef)}</span></div>
      <div class="row"><span class="label">Nội dung</span><span class="value">${escapeHtml(orderInfo)}</span></div>
      <div class="row"><span class="label">Số tiền</span><span class="value amount">${escapeHtml(formatMoney(amount))}</span></div>
      <div class="notice">
        Chọn "Thanh toán thành công" để mô phỏng giao dịch thành công (sẽ gọi IPN thật tới payment-service
        và cập nhật trạng thái đơn hàng), hoặc "Thanh toán thất bại" để mô phỏng giao dịch bị huỷ/lỗi.
      </div>
      <form method="POST" action="/simulate">
        ${hiddenFields}
        <div class="actions">
          <button type="submit" name="result" value="success" class="btn-success">✓ Thanh toán thành công</button>
          <button type="submit" name="result" value="fail" class="btn-fail">✗ Thanh toán thất bại</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`;
}

function renderRedirectPage(returnUrlWithParams) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="1; url=${escapeHtml(returnUrlWithParams)}">
  <title>Đang chuyển hướng...</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #eef1f5; }
    .box { text-align: center; }
  </style>
</head>
<body>
  <div class="box">
    <p>Đang xử lý kết quả thanh toán và chuyển hướng về cửa hàng...</p>
    <p><a href="${escapeHtml(returnUrlWithParams)}">Bấm vào đây nếu không tự chuyển hướng</a></p>
  </div>
</body>
</html>`;
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseFormBody(raw) {
  const result = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    result[decodeURIComponent(key.replace(/\+/g, ' '))] = decodeURIComponent(value.replace(/\+/g, ' '));
  }
  return result;
}

async function handleSimulate(req, res) {
  const raw = await readBody(req);
  const form = parseFormBody(raw);
  const isSuccess = form.result === 'success';

  const txnRef = form.vnp_TxnRef || '';
  const amount = form.vnp_Amount || '0';
  const orderInfo = form.vnp_OrderInfo || '';
  const returnUrl = form.vnp_ReturnUrl || '';
  const ipAddr = req.socket.remoteAddress || '127.0.0.1';

  const now = new Date();
  const responseParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: TMN_CODE,
    vnp_Amount: amount,
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: `MOCKBANK${Date.now()}`,
    vnp_CardType: 'ATM',
    vnp_OrderInfo: orderInfo,
    vnp_PayDate: formatVnpDate(now),
    vnp_ResponseCode: isSuccess ? '00' : '24',
    vnp_TmnCode2: undefined,
    vnp_TransactionNo: String(Date.now()).slice(-10),
    vnp_TransactionStatus: isSuccess ? '00' : '02',
    vnp_TxnRef: txnRef,
  };
  delete responseParams.vnp_TmnCode2;

  const { queryString, secureHash } = buildSignedQuery(responseParams, HASH_SECRET);

  // Server-to-server IPN call to payment-service — this is the authoritative
  // confirmation; the browser redirect below is purely cosmetic.
  const ipnUrl = `${PAYMENT_SERVICE_URL}/api/payments/vnpay/ipn?${queryString}&vnp_SecureHash=${secureHash}`;
  let ipnResult = null;
  try {
    const ipnResponse = await fetch(ipnUrl, { headers: { 'X-Forwarded-For': ipAddr } });
    ipnResult = await ipnResponse.json().catch(() => null);
    console.log(`[mock-vnpay] IPN -> ${ipnUrl}`);
    console.log('[mock-vnpay] IPN result:', ipnResult);
  } catch (err) {
    console.error('[mock-vnpay] IPN call failed:', err.message);
  }

  // Cosmetic browser redirect back to the storefront's return URL.
  const returnParams = { ...responseParams, vnp_SecureHash: secureHash, vnp_SecureHashType: 'HmacSHA512' };
  const returnQuery = Object.entries(returnParams)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const separator = returnUrl.includes('?') ? '&' : '?';
  const redirectTo = `${returnUrl}${separator}${returnQuery}`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderRedirectPage(redirectTo));
}

const server = http.createServer(async (req, res) => {
  try {
    const fullUrl = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && fullUrl.pathname === '/paymentv2/vpcpay.html') {
      const query = Object.fromEntries(fullUrl.searchParams.entries());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderCheckoutPage(query));
      return;
    }

    if (req.method === 'POST' && fullUrl.pathname === '/simulate') {
      await handleSimulate(req, res);
      return;
    }

    if (req.method === 'GET' && fullUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found (mock-vnpay-service)');
  } catch (err) {
    console.error('[mock-vnpay] error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal error (mock-vnpay-service)');
  }
});

server.listen(PORT, () => {
  console.log(`[mock-vnpay] listening on :${PORT} (TMN_CODE=${TMN_CODE})`);
});
