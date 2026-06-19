$DOCKERHUB_USERNAME = "sinhviennamhai"
$CTX = "d:\TTTN\hub-deploy\db-init"

$services = @("auth", "product", "warehouse", "cart", "order", "payment", "shipping")

Write-Host "=== Build va push 7 MySQL images len Docker Hub ===" -ForegroundColor Cyan

foreach ($svc in $services) {
    $tag = "${DOCKERHUB_USERNAME}/tttn-mysql-${svc}:latest"
    $dockerfile = "$CTX\${svc}.Dockerfile"

    Write-Host "`n[BUILD] $tag" -ForegroundColor Yellow
    docker build -t $tag -f $dockerfile $CTX
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED build $tag" -ForegroundColor Red; continue }

    Write-Host "[PUSH]  $tag" -ForegroundColor Yellow
    docker push $tag
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED push $tag" -ForegroundColor Red; continue }

    Write-Host "[OK]    $tag" -ForegroundColor Green
}

Write-Host "`n=== Xong! 7 MySQL images da co tren hub.docker.com/$DOCKERHUB_USERNAME ===" -ForegroundColor Cyan
