# 📱 GUÍA COMPLETA: Generar APK para La Sexta App

## 🎯 **Objetivo**
Generar un APK que puedas transferir directamente a tu móvil para probar la aplicación con el splash screen implementado.

## 📋 **Pasos a Seguir**

### **1️⃣ Abrir Terminal en Cursor**
- Abre la terminal integrada en Cursor
- Navega al directorio del proyecto:
```bash
cd C:\Users\leand\OneDrive\Desktop\lasextaapp\lasextaapp
```

### **2️⃣ Verificar Configuración**
```bash
# Verificar que tienes la carpeta android
dir android

# Verificar que tienes node_modules
dir node_modules
```

### **3️⃣ Compilar la Aplicación**
```bash
# Compilar para producción
ionic build
```

### **4️⃣ Sincronizar con Capacitor**
```bash
# Sincronizar archivos web con Android
npx cap sync android
```

### **5️⃣ Generar el APK**
```bash
# Cambiar al directorio android
cd android

# Generar APK debug (para pruebas)
.\gradlew assembleDebug
```

### **6️⃣ Ubicación del APK**
El APK se generará en:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

Si no aparece en esa ubicación, busca en:
```
android\app\build\intermediates\apk\debug\app-debug.apk
```

## 🔧 **Comandos Alternativos**

### **Si gradlew no funciona:**
```bash
# Usar gradle directamente
gradle assembleDebug
```

### **Si hay problemas de permisos:**
```bash
# En PowerShell como administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Para generar APK release (firmado):**
```bash
.\gradlew assembleRelease
```

## 📱 **Transferir APK al Móvil**

### **Opción 1: Google Drive**
1. Sube el APK a Google Drive
2. Abre Google Drive en tu móvil
3. Descarga el archivo
4. Instala desde el archivo descargado

### **Opción 2: Telegram/WhatsApp**
1. Envía el APK por Telegram o WhatsApp
2. Abre el archivo en tu móvil
3. Instala directamente

### **Opción 3: Snapdrop.net**
1. Abre snapdrop.net en tu PC y móvil (misma Wi-Fi)
2. Arrastra el APK desde tu PC
3. Se transfiere automáticamente al móvil

### **Opción 4: USB**
1. Conecta tu móvil por USB
2. Copia el APK a la carpeta Downloads
3. Desconecta y instala desde el móvil

## 🛠️ **Solución de Problemas**

### **Error: "gradlew no se reconoce"**
```bash
# Verificar que estás en la carpeta android
cd android

# Verificar que existe gradlew.bat
dir gradlew.bat

# Ejecutar con extensión
.\gradlew.bat assembleDebug
```

### **Error: "Java no encontrado"**
1. Instalar Java JDK 11 o superior
2. Configurar variable de entorno JAVA_HOME
3. Reiniciar terminal

### **Error: "Android SDK no encontrado"**
1. Instalar Android Studio
2. Configurar ANDROID_HOME
3. Aceptar licencias: `.\gradlew --accept-license`

### **Error: "Permisos insuficientes"**
```bash
# En PowerShell como administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📊 **Verificación del APK**

### **Tamaño esperado:**
- APK debug: ~15-25 MB
- APK release: ~10-20 MB

### **Contenido del APK:**
- ✅ Splash screen con logo de La Sexta
- ✅ Fondo blanco
- ✅ Transición fluida
- ✅ Todas las páginas de la app
- ✅ Navegación por tabs

## 🎉 **Resultado Final**

Una vez instalado en tu móvil, deberías ver:

1. **Al abrir la app:**
   - Splash screen con logo de La Sexta
   - Fondo blanco
   - Animación suave

2. **Después del splash:**
   - Primera pantalla de la app
   - Navegación por tabs funcionando
   - Todas las funcionalidades disponibles

## 📞 **Si Necesitas Ayuda**

Si encuentras algún error específico:
1. Copia el mensaje de error completo
2. Verifica que tienes Java y Android SDK instalados
3. Intenta con los comandos alternativos
4. Revisa los permisos de ejecución

¡El APK estará listo para transferir a tu móvil! 🚀


