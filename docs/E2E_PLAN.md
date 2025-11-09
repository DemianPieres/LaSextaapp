# Plan de Pruebas End-to-End (E2E)

## Objetivo
Validar el flujo completo de tickets QR entre usuarios clientes y administradores:

1. **Captura de credenciales:** login de cliente y administrador.
2. **Emisión y entrega:** generación y envío de tickets por parte del administrador.
3. **Consumo:** visualización de tickets por el cliente y validación (uso único) por el administrador.

## Alcance de escenarios

| Escenario | Descripción | Resultado esperado |
|-----------|-------------|--------------------|
| Cliente visualiza tickets activos | El cliente inicia sesión, navega a `Mis Tickets`, ve estados de carga/error y abre el modal con el QR | Se muestra el QR válido y la metadata con fechas correctas |
| Emisión/admin | El administrador inicia sesión, genera un ticket para un usuario, lo envía por correo y verifica que el estado queda en `valido` | El panel refleja el nuevo ticket y se confirma el envío |
| Validación de QR | Con un ticket válido, el admin escanea (endpoint) y el estado cambia a `usado`; un segundo intento devuelve 404 | El flujo de uso único se respeta y la UI informa resultados |

## Preparación de datos

- Crear usuarios base (cliente y admin) mediante script/seed o usando la colección `manual-testing.http`.
- Popular tickets de ejemplo para validar estados `valido`, `usado`, `expirado` (puede realizarse con la API). 
- Configurar variables en `cypress.config.ts` o mediante `CYPRESS_*` antes de ejecutar las pruebas.

## Estrategia técnica

- Se utilizará Cypress E2E con base URL `http://localhost:5173` y la API en `http://localhost:4000/api`.
- Los comandos personalizados (`loginAsClient`, `loginAsAdmin`, `generateTicketForUser`) permiten preparar datos vía API antes de navegar a la UI.
- Los casos de prueba principales están bosquejados en `cypress/e2e/tickets-flow.cy.ts`; se marcaron con `it.skip` hasta disponer de datos estables.
  - El archivo se actualizó para crear usuarios temporales, emitir un ticket vía API y validar el flujo completo (requiere ejecutar el seed o contar con credenciales admin válidas).
- Para validar correos, se sugiere mockear el envío (SMTP) o utilizar un buzón de pruebas y verificar a nivel de API la respuesta `200` del endpoint `/admin/tickets/send/:userId`.

## Automatización complementaria

- Añadir test de regresión para login (`cypress/e2e/auth.cy.ts`) cubriendo mensajes de error cuando las credenciales son inválidas.
- Crear fixtures con respuestas típicas y, si se desea aislar la UI, interceptar llamadas con `cy.intercept`. 
- Integrar las pruebas en CI con jobs paralelos que levanten backend y frontend, asegurando la semilla previa de datos.

## Métricas de salida

- Todos los escenarios anteriores ejecutados en < 5 minutos.
- Creación automática de tickets y validación sin intervención manual usando los comandos personalizados.
- Evidencias: capturas de pantalla al finalizar cada `it`, video de ejecución (Cypress por defecto). 

La implementación de estos pasos entregará confianza sobre el flujo crítico de emisión, consumo y validación de tickets en la plataforma.
*** End Patch

