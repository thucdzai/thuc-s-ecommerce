const AppError = require('../../utils/AppError');
const password = require('../../utils/password');
const jwt = require('../../utils/jwt');
const authRepository = require('./auth.repository');
const redis = require('../../config/redis');
const authEvents = require('../../events/authEvents.publisher');

// ---------------------------------------------------------------------------
// Chống spam đăng nhập sai (brute-force/dò mật khẩu) bằng Redis — đây là use-case kinh điển
// của Redis: đếm số lần trong 1 cửa sổ thời gian + tự hết hạn (TTL), không cần bảng DB riêng,
// và không phụ thuộc instance nào của service xử lý request (nếu sau này scale nhiều bản sao).
// Khoá theo email (không theo IP) vì hệ thống chưa có hạ tầng lấy IP thực phía sau proxy.
// ---------------------------------------------------------------------------
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;

function loginFailKey(email) {
    return `auth:login_fail:${email.trim().toLowerCase()}`;
}

function toPublicUser(user, roles) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        status: user.status,
        roles,
    };
}

async function issueTokenPair(user, roles, deviceInfo) {
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = jwt.signAccessToken(payload);
    const refreshToken = jwt.signRefreshToken(payload);

    await authRepository.saveRefreshToken({
        userId: user.id,
        tokenHash: jwt.hashToken(refreshToken),
        deviceInfo: deviceInfo || null,
        expiresAt: jwt.refreshTokenExpiryDate(),
    });

    return { accessToken, refreshToken };
}

async function register({ email, password: plainPassword, fullName }) {
    const existing = await authRepository.findUserByEmail(email);
    if (existing) {
        throw new AppError(409, 'Email này đã được đăng ký');
    }

    const passwordHash = await password.hash(plainPassword);
    const userId = await authRepository.createUser({ email, passwordHash, fullName });
    await authRepository.assignDefaultRole(userId);

    const user = await authRepository.findUserById(userId);
    const roles = await authRepository.getRoleNamesByUserId(userId);

    // Phát sự kiện 'user.registered' SAU KHI đã commit DB thành công — Notification Service
    // lắng nghe để gửi email chào mừng (xem events/authEvents.publisher.js).
    await authEvents.publishUserRegistered({ userId: user.id, email: user.email, fullName: user.full_name });

    return toPublicUser(user, roles);
}

async function login({ email, password: plainPassword }, deviceInfo) {
    const failKey = loginFailKey(email);

    // 1) Kiểm tra Redis TRƯỚC khi đụng tới DB/bcrypt — nếu đã vượt ngưỡng thì chặn ngay,
    // vừa tiết kiệm tài nguyên (bcrypt.compare cố ý chậm/tốn CPU), vừa khiến kẻ dò mật khẩu
    // không thể spam tiếp tục.
    const failCountRaw = await redis.client.get(failKey);
    const failCount = Number(failCountRaw || 0);
    if (failCount >= LOGIN_FAIL_LIMIT) {
        const ttl = await redis.client.ttl(failKey);
        const minutesLeft = Math.max(1, Math.ceil(ttl / 60));
        console.warn(`[RateLimit][Redis] Chặn đăng nhập "${email}" — đã sai ${failCount}/${LOGIN_FAIL_LIMIT} lần, còn khoá ~${minutesLeft} phút (key=${failKey})`);
        throw new AppError(429, `Bạn đã nhập sai quá ${LOGIN_FAIL_LIMIT} lần. Vui lòng thử lại sau khoảng ${minutesLeft} phút`);
    }
    console.log(`[RateLimit][Redis] Đọc bộ đếm đăng nhập sai cho "${email}" — hiện ${failCount}/${LOGIN_FAIL_LIMIT} lần (key=${failKey})`);

    // Ghi nhận 1 lần thử sai — dùng INCR (nguyên tử) rồi đặt EXPIRE ở lần đầu tạo key,
    // tạo thành cửa sổ trượt 15 phút: hễ không có lần sai mới nào trong 15 phút, bộ đếm tự xoá.
    async function registerFailedAttempt(reason) {
        const newCount = await redis.client.incr(failKey);
        if (newCount === 1) {
            await redis.client.expire(failKey, LOGIN_FAIL_WINDOW_SECONDS);
        }
        console.warn(`[RateLimit][Redis] Ghi nhận đăng nhập sai cho "${email}" (${reason}) — lần thứ ${newCount}/${LOGIN_FAIL_LIMIT} (key=${failKey}, TTL=${LOGIN_FAIL_WINDOW_SECONDS}s)`);
    }

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        await registerFailedAttempt('không tìm thấy tài khoản');
        throw new AppError(401, 'Email hoặc mật khẩu không đúng');
    }

    if (user.status === 'banned') {
        throw new AppError(403, 'Tài khoản của bạn đã bị khóa');
    }

    const passwordMatches = await password.compare(plainPassword, user.password_hash);
    if (!passwordMatches) {
        await registerFailedAttempt('sai mật khẩu');
        throw new AppError(401, 'Email hoặc mật khẩu không đúng');
    }

    // Đăng nhập đúng — xoá bộ đếm để các lần đăng nhập hợp lệ tiếp theo không bị ảnh hưởng
    // bởi vài lần gõ nhầm trước đó.
    if (failCount > 0) {
        await redis.client.del(failKey);
        console.log(`[RateLimit][Redis] Đăng nhập thành công sau ${failCount} lần sai — đã xoá bộ đếm cho "${email}" (key=${failKey})`);
    }

    const roles = await authRepository.getRoleNamesByUserId(user.id);
    const tokens = await issueTokenPair(user, roles, deviceInfo);

    return { user: toPublicUser(user, roles), ...tokens };
}

async function refresh(refreshTokenValue, deviceInfo) {
    let payload;
    try {
        payload = jwt.verifyRefreshToken(refreshTokenValue);
    } catch (err) {
        throw new AppError(401, 'Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const tokenHash = jwt.hashToken(refreshTokenValue);
    const stored = await authRepository.findActiveRefreshToken(tokenHash);
    if (!stored) {
        throw new AppError(401, 'Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại');
    }

    const user = await authRepository.findUserById(payload.sub);
    if (!user || user.status === 'banned') {
        throw new AppError(401, 'Tài khoản không khả dụng');
    }

    const roles = await authRepository.getRoleNamesByUserId(user.id);

    // Rotation: thu hồi token cũ và phát hành cặp token mới — giảm rủi ro replay attack.
    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = await issueTokenPair(user, roles, deviceInfo);

    return tokens;
}

async function logout(refreshTokenValue) {
    const tokenHash = jwt.hashToken(refreshTokenValue);
    await authRepository.revokeRefreshToken(tokenHash);
}

module.exports = { register, login, refresh, logout, toPublicUser };
