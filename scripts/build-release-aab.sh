#!/bin/bash
# Script para generar Android App Bundle (AAB) para Google Play Store
# Ejecutar desde el directorio raíz del proyecto

echo "🔨 Generando Android App Bundle (AAB) para producción..."

# 1. Limpiar builds anteriores
echo ""
echo "📦 Limpiando builds anteriores..."
cd android
./gradlew clean
if [ $? -ne 0 ]; then
    echo "❌ Error al limpiar el proyecto"
    cd ..
    exit 1
fi

# 2. Construir el frontend
echo ""
echo "🌐 Construyendo frontend..."
cd ..
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error al construir el frontend"
    exit 1
fi

# 3. Sincronizar con Capacitor
echo ""
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "❌ Error al sincronizar Capacitor"
    exit 1
fi

# 4. Generar AAB
echo ""
echo "📱 Generando Android App Bundle (AAB)..."
cd android
./gradlew bundleRelease
if [ $? -ne 0 ]; then
    echo "❌ Error al generar el AAB"
    cd ..
    exit 1
fi

# 5. Copiar AAB al directorio raíz
cd ..
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    DEST_PATH="LaSextaApp-release-$TIMESTAMP.aab"
    cp "$AAB_PATH" "$DEST_PATH"
    SIZE=$(du -h "$DEST_PATH" | cut -f1)
    echo ""
    echo "✅ AAB generado exitosamente!"
    echo "   Archivo: $DEST_PATH"
    echo "   Tamaño: $SIZE"
    echo ""
    echo "📝 IMPORTANTE: Este AAB debe ser firmado con tu keystore de producción antes de subirlo a Google Play Store"
else
    echo "❌ No se encontró el AAB generado"
    exit 1
fi

