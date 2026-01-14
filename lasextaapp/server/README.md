# Backend de tickets · La Sexta App

Este backend Express expone una API REST mínima para gestionar los tickets (QRs) y usuarios de la aplicación. Se conecta a MongoDB Atlas utilizando el driver oficial (`mongodb` ≥ 6.7).

## Configuración rápida

1. Copiá `env.example` a `.env` dentro de esta carpeta y actualizá los valores sensibles si es necesario.
2. Instalá las dependencias:
   ```bash
   npm install
   ```
3. Iniciá el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

Por defecto el servidor escucha en `http://localhost:4000`.

## Variables de entorno

| Variable          | Descripción                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `MONGODB_URI`     | URI completa del cluster de MongoDB Atlas. **No** debe exponerse al cliente |
| `MONGODB_DB`      | Nombre de la base de datos (por defecto `complejo_futbol_app`)              |
| `PORT`            | Puerto HTTP para el backend (4000 por defecto)                              |
| `JWT_SECRET`      | Clave usada para firmar los tokens (clientes y administradores)             |
| `ALLOWED_ORIGINS` | (Opcional) Lista separada por comas de orígenes permitidos para CORS        |
| `SMTP_HOST`       | Host del servidor SMTP para envíos de correo                                |
| `SMTP_PORT`       | Puerto SMTP (587/465, etc.)                                                 |
| `SMTP_USER`       | Usuario/Email autenticado para SMTP                                         |
| `SMTP_PASSWORD`   | Contraseña o token de aplicación SMTP                                       |
| `SMTP_FROM`       | Remitente por defecto para los correos (ej. `La Sexta <no-reply@...>`)      |
| `SEED_ADMIN_EMAIL` / `SEED_CLIENT_EMAIL` | (Opcional) Correos por defecto para el script de seed |

## Endpoints principales

| Método | Ruta                                   | Descripción                                               |
|--------|----------------------------------------|-----------------------------------------------------------|
| GET    | `/api/health`                          | Healthcheck del servidor                                  |
| POST   | `/api/auth/register`                   | Registro de un usuario cliente y login automático         |
| POST   | `/api/auth/login`                      | Login de usuario cliente                                  |
| GET    | `/api/auth/me`                         | Perfil del usuario autenticado (JWT cliente)              |
| GET    | `/api/tickets/users/:userId/active`    | Tickets válidos del usuario                               |
| GET    | `/api/tickets/users/:userId/history`   | Tickets usados o expirados del usuario                    |
| PATCH  | `/api/tickets/:ticketId/use`           | Marca un ticket como usado                                |
| POST   | `/api/admin/login`                     | Autentica al administrador y devuelve un JWT              |
| GET    | `/api/admin/users`                     | Lista usuarios (excluye admins) + cantidad de tickets     |
| POST   | `/api/admin/tickets/generate`          | Genera un nuevo ticket QR para un usuario                 |
| POST   | `/api/admin/tickets/send/:userId`      | Envía por correo un ticket específico al usuario          |
| GET    | `/api/admin/tickets/all`               | Lista todos los tickets con detalles                      |
| PUT    | `/api/admin/tickets/use/:ticketId`     | Marca un ticket como usado desde el panel administrador   |
| POST   | `/api/admin/tickets/validate/:codigo`  | Valida un QR escaneado y lo marca como usado              |

> Todas las rutas esperan identificadores válidos de MongoDB (`ObjectId`).
> Las rutas `/api/tickets/users/:userId/*` requieren que el `userId` coincida con el usuario autenticado.

## Colección de pruebas manuales

En `server/docs/manual-testing.http` encontrarás ejemplos listos para usar con las extensiones **REST Client** (VSCode) o **Thunder Client**. Allí se cubren los flujos básicos:

1. Registro/login de cliente y recuperación de sus tickets.
2. Login de administrador y emisión de un ticket.
3. Envío y validación de un ticket por parte del administrador.

Actualiza los tokens en las variables del archivo según las respuestas de tu entorno local.

### Seed rápido

Ejecuta:

```bash
npm run seed
```

Esto creará (si no existen) un administrador, un cliente demo y un ticket válido en la colección `tickets`. Personaliza correos y contraseñas mediante las variables `SEED_*`.

## Estructura de carpetas

```
server/
├─ src/
│  ├─ config/
│  │  └─ database.ts   # Gestión de la conexión a MongoDB
│  ├─ middleware/
│  │  └─ auth.ts       # Middleware JWT para rutas de administrador
│  ├─ routes/
│  │  └─ tickets.ts    # Rutas REST relacionadas a tickets
│  │  └─ admin.ts      # Rutas avanzadas para el modo administrador
│  ├─ utils/
│  │  ├─ email.ts      # Envío de correos con Nodemailer
│  │  ├─ jwt.ts        # Firma y verificación de tokens JWT
│  │  ├─ objectId.ts   # Validación de ObjectId
│  │  ├─ password.ts   # Helpers para bcrypt
│  │  └─ tickets.ts    # Generación de códigos y expiraciones de tickets
│  └─ index.ts         # Punto de entrada del servidor Express
├─ env.example         # Plantilla de variables de entorno
├─ package.json
└─ tsconfig.json
```

## Próximos pasos sugeridos

- Agregar autenticación (JWT o similar) para proteger las rutas.
- Validar payloads con Zod o Joi.
- Implementar WebSockets o cambios reactivos para sincronización en tiempo real.
- Añadir pruebas unitarias/integración para asegurar el flujo de emisión y validación de tickets.
- Sustituir el envío de correos por un proveedor transaccional en producción (SendGrid, SES, etc.).

