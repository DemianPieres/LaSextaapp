# Configuración de variables de entorno

## Backend (`server/.env`)

1. Copiá `server/env.example` a `server/.env`:
   ```bash
   cd server
   cp env.example .env
   ```
2. Editá los valores sensibles:
   - `MONGODB_URI`: cadena de conexión válida a tu cluster.
   - `JWT_SECRET`: reemplazá por una clave robusta (se usa para clientes y administradores).
   - Variables `SMTP_*`: necesarias si vas a enviar los tickets por correo.
   - `ALLOWED_ORIGINS`: agregá `http://localhost:5173` (o el puerto que use Vite) para habilitar CORS desde el frontend.

> Podés ejecutar `npm run seed` dentro de `server/` para crear automáticamente:
> - Admin por defecto (`admin@example.com` / `Admin123!`)
> - Cliente demo (`cliente-demo@example.com` / `Demo123!`)
> - Un ticket válido asociado al cliente.
> Personalizá los datos con variables `SEED_*` en el `.env`.

## Frontend (`.env.local`)

1. En la raíz del proyecto, creá un archivo `.env.local` con el siguiente contenido base:
   ```bash
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_ENABLE_MOCKS=false
   VITE_FACEBOOK_APP_ID=tu_facebook_app_id
   VITE_INSTAGRAM_APP_ID=tu_instagram_app_id
   ```
2. Ajustá `VITE_API_BASE_URL` cuando despliegues el backend en otro host.
3. Para habilitar el registro con redes sociales:
   - Obtén un App ID de Facebook desde [Facebook Developers](https://developers.facebook.com/)
   - El mismo App ID puede usarse para Instagram (Instagram usa Facebook Login)
   - Agrega los IDs a las variables `VITE_FACEBOOK_APP_ID` y `VITE_INSTAGRAM_APP_ID`

> **Importante:** Los archivos `.env` y `.env.local` no deben versionarse. Asegurate de mantenerlos fuera del control de versiones.

> Si vas a utilizar el lector de QR en dispositivos móviles, ejecutá `npx cap sync` después de instalar las dependencias para registrar el plugin oficial `@capacitor/barcode-scanner`.

## Verificación rápida de endpoints

- Ejecutá `npm install` tanto en la raíz como en `server/` y levanta ambos servicios (`npm run dev` en cada carpeta).
- Utilizá la colección `server/docs/manual-testing.http` (compatible con extensiones REST Client) para probar:
  - Registro/login de clientes.
  - Login de administrador.
  - Emisión, envío y validación de tickets.

Con estos pasos tendrás un entorno completo para continuar el desarrollo del flujo de tickets y modo administrador.
*** End Patch

