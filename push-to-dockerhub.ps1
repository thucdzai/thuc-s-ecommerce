$DOCKERHUB_USERNAME = "sinhviennamhai"

$images = @(
    "tttn-auth-service",
    "tttn-cart-service",
    "tttn-frontend",
    "tttn-mock-vnpay",
    "tttn-notification-service",
    "tttn-order-service",
    "tttn-payment-service",
    "tttn-product-service",
    "tttn-shipping-service",
    "tttn-warehouse-service"
)

Write-Host "=== Bat dau tag va push len Docker Hub (user: $DOCKERHUB_USERNAME) ===" -ForegroundColor Cyan

foreach ($img in $images) {
    $local  = "${img}:latest"
    $remote = "${DOCKERHUB_USERNAME}/${img}:latest"

    Write-Host "`n[TAG] $local -> $remote" -ForegroundColor Yellow
    docker tag $local $remote
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED tag $local" -ForegroundColor Red; continue }

    Write-Host "[PUSH] $remote" -ForegroundColor Yellow
    docker push $remote
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED push $remote" -ForegroundColor Red; continue }

    Write-Host "[OK] $remote" -ForegroundColor Green
}

Write-Host "`n=== Xong! Tat ca image da co tren hub.docker.com/$DOCKERHUB_USERNAME ===" -ForegroundColor Cyan
