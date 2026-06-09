#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== E2E TEST: Luồng Đăng nhập -> Tạo đơn hàng -> Thanh toán VNPay ===${NC}\n"

# Base URLs
AUTH_URL="http://localhost:3000/api/auth"
USERS_URL="http://localhost:3000/api/users"
PRODUCTS_URL="http://localhost:3000/api/products"
CART_URL="http://localhost:3000/api/cart"
ORDERS_URL="http://localhost:3000/api/orders"
PAYMENTS_URL="http://localhost:3000/api/payments"

# Test user credentials
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test@12345"
TEST_NAME="Test User"
TEST_PHONE="0987654321"

# ============================================================================
# STEP 1: Đăng ký tài khoản (nếu chưa có)
# ============================================================================
echo -e "${YELLOW}[1/7] Đăng ký tài khoản...${NC}"

REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

echo "Response: $REGISTER_RESPONSE"

# ============================================================================
# STEP 2: Đăng nhập và lấy JWT token
# ============================================================================
echo -e "\n${YELLOW}[2/7] Đăng nhập...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo -e "${RED}❌ Lỗi: Không thể lấy token. Response: $LOGIN_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Token: ${ACCESS_TOKEN:0:30}...${NC}"

# ============================================================================
# STEP 3: Thêm địa chỉ giao hàng
# ============================================================================
echo -e "\n${YELLOW}[3/7] Thêm địa chỉ giao hàng...${NC}"

ADDRESS_RESPONSE=$(curl -s -X POST "$USERS_URL/addresses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipientName\": \"$TEST_NAME\",
    \"phone\": \"$TEST_PHONE\",
    \"province\": \"Hồ Chí Minh\",
    \"district\": \"Quận 1\",
    \"ward\": \"Phường Bến Nghé\",
    \"streetDetail\": \"123 Đường Nguyễn Huệ\",
    \"isDefault\": true
  }")

echo "Response: $ADDRESS_RESPONSE"

ADDRESS_ID=$(echo "$ADDRESS_RESPONSE" | jq -r '.data.id' 2>/dev/null || echo "")

if [ -z "$ADDRESS_ID" ] || [ "$ADDRESS_ID" == "null" ]; then
  echo -e "${RED}❌ Lỗi: Không thể tạo địa chỉ${NC}"
fi

# ============================================================================
# STEP 4: Lấy danh sách sản phẩm và thêm vào giỏ hàng
# ============================================================================
echo -e "\n${YELLOW}[4/7] Lấy danh sách sản phẩm...${NC}"

PRODUCTS=$(curl -s -X GET "$PRODUCTS_URL?limit=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $PRODUCTS" | jq '.data[0:2]'

# Lấy SKU ID của sản phẩm đầu tiên
SKU_ID=$(echo "$PRODUCTS" | jq -r '.data[0].skus[0].id' 2>/dev/null || echo "")

if [ -z "$SKU_ID" ] || [ "$SKU_ID" == "null" ]; then
  echo -e "${RED}❌ Lỗi: Không tìm thấy sản phẩm${NC}"
  exit 1
fi

echo -e "${GREEN}✓ SKU ID: $SKU_ID ${NC}"

echo -e "\n${YELLOW}[5/7] Thêm sản phẩm vào giỏ hàng...${NC}"

CART_RESPONSE=$(curl -s -X POST "$CART_URL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"skuId\": \"$SKU_ID\",
    \"quantity\": 1
  }")

echo "Response: $CART_RESPONSE"

# ============================================================================
# STEP 5: Tạo đơn hàng (checkout)
# ============================================================================
echo -e "\n${YELLOW}[6/7] Tạo đơn hàng...${NC}"

CHECKOUT_RESPONSE=$(curl -s -X POST "$ORDERS_URL/checkout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"skuId\": \"$SKU_ID\",
      \"quantity\": 1
    }],
    \"recipientName\": \"$TEST_NAME\",
    \"recipientPhone\": \"$TEST_PHONE\",
    \"shippingAddress\": \"123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, Hồ Chí Minh\",
    \"note\": \"Test order\"
  }")

echo "Response: $CHECKOUT_RESPONSE" | jq '.'

ORDER_CODE=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.orderCode' 2>/dev/null || echo "")

if [ -z "$ORDER_CODE" ] || [ "$ORDER_CODE" == "null" ]; then
  echo -e "${RED}❌ Lỗi: Không thể tạo đơn hàng. Response: $CHECKOUT_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Order Code: $ORDER_CODE ${NC}"

# ============================================================================
# STEP 7: Tạo URL thanh toán VNPay
# ============================================================================
echo -e "\n${YELLOW}[7/7] Tạo URL thanh toán VNPay...${NC}"

PAYMENT_URL_RESPONSE=$(curl -s -X POST "$PAYMENTS_URL/vnpay/create-url" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderCode\": \"$ORDER_CODE\"
  }")

echo "Response: $PAYMENT_URL_RESPONSE" | jq '.'

PAYMENT_URL=$(echo "$PAYMENT_URL_RESPONSE" | jq -r '.data.paymentUrl' 2>/dev/null || echo "")

if [ -z "$PAYMENT_URL" ] || [ "$PAYMENT_URL" == "null" ]; then
  echo -e "${RED}❌ Lỗi: Không thể tạo URL thanh toán${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Payment URL: $PAYMENT_URL ${NC}"

# ============================================================================
# Kết quả
# ============================================================================
echo -e "\n${GREEN}=== ✓ TEST THÀNH CÔNG ===${NC}"
echo -e "\n${BLUE}Từng bước:${NC}"
echo "1. ✓ Đăng ký tài khoản: $TEST_EMAIL"
echo "2. ✓ Đăng nhập thành công"
echo "3. ✓ Thêm địa chỉ giao hàng: $ADDRESS_ID"
echo "4. ✓ Lấy danh sách sản phẩm"
echo "5. ✓ Thêm sản phẩm vào giỏ: SKU=$SKU_ID"
echo "6. ✓ Tạo đơn hàng: $ORDER_CODE"
echo "7. ✓ Tạo URL thanh toán: $PAYMENT_URL"

echo -e "\n${BLUE}Bước tiếp theo:${NC}"
echo "1. Mở browser và truy cập: http://localhost:3000/checkout/pay/$ORDER_CODE"
echo "2. Trang sẽ tự động redirect sang trang thanh toán giả lập VNPay"
echo "3. Chọn 'Thanh toán thành công' để mô phỏng giao dịch thành công"
echo "4. Xem kết quả thanh toán tại: http://localhost:3000/checkout/payment-result"

echo -e "\n${BLUE}URL thanh toán trực tiếp:${NC}"
echo "$PAYMENT_URL"
