const Redis = require('ioredis');
const env = require('./env');

// Dùng để đếm số lần đăng nhập sai theo email — chống spam/brute-force ở endpoint /api/auth/login
// (xem auth.service.js#login). lazyConnect=true để service tự gọi connect() khi bootstrap,
// tránh kết nối ngầm trước khi ta kiểm soát được thứ tự khởi động.
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
