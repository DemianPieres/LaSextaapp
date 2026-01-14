# Checklist de Release para Google Play Store

## ✅ Configuración Técnica Completada

### Android
- [x] `targetSdkVersion` actualizado a 35 (Android 15)
- [x] `compileSdkVersion` configurado a 35
- [x] Compatibilidad con arquitecturas 64-bit (arm64-v8a)
- [x] `applicationId` actualizado a `com.lasexta.app`
- [x] `versionCode` incrementado a 3
- [x] `versionName` actualizado a "1.2.0"
- [x] ProGuard configurado para release (minifyEnabled: true)
- [x] Permisos optimizados en AndroidManifest.xml
  - INTERNET (requerido)
  - CAMERA (para escanear QR)
  - POST_NOTIFICATIONS (para notificaciones locales)

### Build de Producción
- [x] Scripts para generar AAB creados (`scripts/build-release-aab.ps1` y `.sh`)
- [x] Configuración de Vite optimizada para producción
- [x] Minificación y code splitting configurados
- [x] Console.log eliminados en producción (drop_console: true)

### Seguridad
- [x] HTTPS forzado en producción
- [x] Variables de entorno seguras
- [x] Permisos justificados y documentados
- [x] Manejo seguro de errores sin exponer información sensible

### Código
- [x] Código de depuración eliminado
- [x] Logs condicionales (solo en desarrollo)
- [x] Manejo de errores mejorado
- [x] Sin código muerto o duplicado crítico

## 📋 Pasos para Generar AAB de Producción

### 1. Preparar Keystore (Solo primera vez)
```bash
# Generar keystore de producción (guardar la contraseña de forma segura)
keytool -genkey -v -keystore lasexta-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias lasexta

# Configurar signing en android/app/build.gradle:
# signingConfigs {
#   release {
#     storeFile file('../../lasexta-release-key.jks')
#     storePassword 'TU_PASSWORD'
#     keyAlias 'lasexta'
#     keyPassword 'TU_PASSWORD'
#   }
# }
```

### 2. Generar AAB
**Windows:**
```powershell
.\scripts\build-release-aab.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/build-release-aab.sh
./scripts/build-release-aab.sh
```

### 3. Firmar AAB (si no está configurado en build.gradle)
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore lasexta-release-key.jks app-release.aab lasexta
```

## 📝 Elementos Requeridos para Play Store

### Información de la App
- [ ] Nombre de la app: "La Sexta App"
- [ ] Descripción corta (80 caracteres)
- [ ] Descripción completa (4000 caracteres)
- [ ] Capturas de pantalla (mínimo 2, recomendado 8)
- [ ] Icono de alta resolución (512x512 px)
- [ ] Imagen destacada (1024x500 px)

### Clasificación de Contenido
- [ ] Clasificación de contenido (PEGI, ESRB, etc.)
- [ ] Política de privacidad (URL pública)
- [ ] Términos de servicio (opcional pero recomendado)

### Datos de Contacto
- [ ] Email de soporte
- [ ] URL del sitio web (opcional)
- [ ] Dirección física (si aplica)

## 🔒 Política de Privacidad

La app debe incluir una política de privacidad que explique:
- Qué datos se recopilan (email, nombre, puntos, tickets)
- Cómo se usan los datos
- Con quién se comparten (si aplica)
- Cómo se almacenan y protegen
- Derechos del usuario (acceso, eliminación, etc.)

## ⚠️ Notas Importantes

1. **Keystore**: Guarda el keystore y las contraseñas de forma segura. Si se pierden, no podrás actualizar la app en Play Store.

2. **Testing**: Prueba el AAB en un dispositivo real antes de subirlo a Play Store.

3. **Versión**: Incrementa `versionCode` y `versionName` en cada release.

4. **Backend**: Asegúrate de que el backend esté en producción y estable antes de publicar.

5. **Permisos**: Los permisos de cámara y notificaciones se solicitan en tiempo de ejecución, cumpliendo con las políticas de Google Play.

## 🚀 Próximos Pasos

1. Generar AAB firmado
2. Crear cuenta de desarrollador en Google Play Console
3. Completar información de la app
4. Subir AAB a Play Console
5. Configurar política de privacidad
6. Revisar y publicar

