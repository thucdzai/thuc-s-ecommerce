const asyncHandler = require('../../utils/asyncHandler');
const { ok, created } = require('../../utils/apiResponse');
const cartService = require('./cart.service');

// GET /api/cart — trả về giỏ hàng của chính người dùng đang đăng nhập, đã tính sẵn lineTotal/subtotal.
const getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);
    return ok(res, cart, 'Lấy giỏ hàng thành công');
});

// POST /api/cart/items — thêm sản phẩm vào giỏ (cộng dồn số lượng nếu đã có).
const addItem = asyncHandler(async (req, res) => {
    const cart = await cartService.addItem(req.user.id, req.body);
    return created(res, cart, 'Đã thêm sản phẩm vào giỏ hàng');
});

// PATCH /api/cart/items/:skuId — đặt lại số lượng của 1 sản phẩm trong giỏ.
const updateItem = asyncHandler(async (req, res) => {
    const cart = await cartService.updateItemQuantity(req.user.id, Number(req.params.skuId), req.body.quantity);
    return ok(res, cart, 'Đã cập nhật số lượng sản phẩm');
});

// DELETE /api/cart/items/:skuId — xóa 1 sản phẩm khỏi giỏ.
const removeItem = asyncHandler(async (req, res) => {
    const cart = await cartService.removeItem(req.user.id, Number(req.params.skuId));
    return ok(res, cart, 'Đã xóa sản phẩm khỏi giỏ hàng');
});

// DELETE /api/cart — xóa toàn bộ giỏ hàng.
const clearCart = asyncHandler(async (req, res) => {
    const cart = await cartService.clearCart(req.user.id);
    return ok(res, cart, 'Đã xóa toàn bộ giỏ hàng');
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
