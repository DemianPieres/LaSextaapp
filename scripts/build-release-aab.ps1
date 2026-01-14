# Script para generar Android App Bundle (AAB) para Google Play Store
# Ejecutar desde el directorio raíz del proyecto

Write-Host "🔨 Generando Android App Bundle (AAB) para producción..." -ForegroundColor Cyan

# 1. Limpiar builds anteriores
Write-Host "`n📦 Limpiando builds anteriores..." -ForegroundColor Yellow
Set-Location android
.\gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al limpiar el proyecto" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 2. Construir el frontend
Write-Host "`n🌐 Construyendo frontend..." -ForegroundColor Yellow
Set-Location ..
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir el frontend" -ForegroundColor Red
    exit 1
}

# 3. Sincronizar con Capacitor
Write-Host "`n🔄 Sincronizando con Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al sincronizar Capacitor" -ForegroundColor Red
    exit 1
}

# 4. Generar AAB
Write-Host "`n📱 Generando Android App Bundle (AAB)..." -ForegroundColor Yellow
Set-Location android
.\gradlew bundleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar el AAB" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 5. Copiar AAB al directorio raíz
Set-Location ..
$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $destPath = "LaSextaApp-release-$timestamp.aab"
    Copy-Item $aabPath -Destination $destPath -Force
    $size = [math]::Round((Get-Item $destPath).Length / 1MB, 2)
    Write-Host "`n✅ AAB generado exitosamente!" -ForegroundColor Green
    Write-Host "   Archivo: $destPath" -ForegroundColor Cyan
    Write-Host "   Tamaño: $size MB" -ForegroundColor Cyan
    Write-Host "`n📝 IMPORTANTE: Este AAB debe ser firmado con tu keystore de producción antes de subirlo a Google Play Store" -ForegroundColor Yellow
} else {
    Write-Host "❌ No se encontró el AAB generado" -ForegroundColor Red
    exit 1
}

