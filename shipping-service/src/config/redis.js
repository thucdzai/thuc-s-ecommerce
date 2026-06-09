const Redis = require('ioredis');
const env = require('./env');

// Cache kết quả xem trước phí vận chuyển — phép tính thuần túy/xác định (cùng địa chỉ + cân nặng
// luôn ra cùng kết quả) nhưng khách hay bấm đi bấm lại để so sánh nhiều địa chỉ ở trang thanh toán
// (xem shipment.service.js#previewFee). lazyConnect=true để service tự gọi connect() khi bootstrap.
const client = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    lazyConnect: true,
});

let connected = false;

async function connect() {
    if (connected) return;
    await client.connect();
    connected = true;
    console.log('[Redis] Đã kết nối tới Redis:', `${env.redis.host}:${env.redis.port}`);
}

async function disconnect() {
    if (!connected) return;
    await client.quit();
    connected = false;
}

module.exports = { client, connect, disconnect };
