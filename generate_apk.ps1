# Script para generar APK de La Sexta App
Write-Host "🚀 Generando APK para La Sexta App..." -ForegroundColor Green

# Cambiar al directorio del proyecto
Set-Location "C:\Users\leand\OneDrive\Desktop\lasextaapp\lasextaapp"

Write-Host "📁 Directorio actual: $(Get-Location)" -ForegroundColor Yellow

# Verificar que existe la carpeta android
if (Test-Path "android") {
    Write-Host "✅ Carpeta android encontrada" -ForegroundColor Green
} else {
    Write-Host "❌ Carpeta android no encontrada" -ForegroundColor Red
    exit 1
}

# Cambiar al directorio android
Set-Location "android"

Write-Host "🔨 Ejecutando gradlew assembleDebug..." -ForegroundColor Yellow

# Ejecutar el build
try {
    .\gradlew assembleDebug
    Write-Host "✅ Build completado exitosamente!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en el build: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Buscar el APK generado
Write-Host "🔍 Buscando APK generado..." -ForegroundColor Yellow

$apkPath = Get-ChildItem -Recurse -Filter "*.apk" | Where-Object { $_.Name -like "*debug*" } | Select-Object -First 1

if ($apkPath) {
    Write-Host "✅ APK encontrado en: $($apkPath.FullName)" -ForegroundColor Green
    Write-Host "📱 Tamaño del APK: $([math]::Round($apkPath.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
    # Copiar a una ubicación más accesible
    $destinationPath = "C:\Users\leand\OneDrive\Desktop\lasextaapp\lasextaapp\LaSextaApp-debug.apk"
    Copy-Item $apkPath.FullName $destinationPath
    Write-Host "📋 APK copiado a: $destinationPath" -ForegroundColor Green
    
    Write-Host "🎉 ¡APK generado exitosamente!" -ForegroundColor Green
    Write-Host "📱 Puedes transferir el archivo a tu móvil desde: $destinationPath" -ForegroundColor Cyan
} else {
    Write-Host "❌ No se encontró el APK generado" -ForegroundColor Red
}

Write-Host "✨ Proceso completado" -ForegroundColor Green


