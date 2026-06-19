const Redis = require('ioredis');
const env = require('./env');

// Cache kết quả truy vấn danh sách/chi tiết sản phẩm — giảm tải cho MySQL khi khách lướt
// danh mục, đổi bộ lọc, bấm qua lại nhiều lần (xem product.service.js#listProducts/getProductDetail).
// lazyConnect=true để service tự gọi connect() khi bootstrap, kiểm soát được thứ tự khởi động.
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
