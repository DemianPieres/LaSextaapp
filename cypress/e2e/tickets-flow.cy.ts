describe('[Flujo de tickets] Cliente y administrador', () => {
  const apiUrl = Cypress.env('apiUrl') as string;
  const adminEmail = Cypress.env('adminEmail') as string;
  const adminPassword = Cypress.env('adminPassword') as string;

  let clientEmail: string;
  let clientPassword: string;
  let clientName: string;
  let clientId: string;
  let ticketCode: string;
  let adminToken: string;

  before(() => {
    clientEmail = `cypress-${Date.now()}@example.com`;
    clientPassword = 'Demo123!';
    clientName = 'Tester Cypress';

    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: {
        email: clientEmail,
        password: clientPassword,
        nombre: clientName,
      },
      failOnStatusCode: false,
    })
      .then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body?.user?.id, 'Usuario creado').to.be.a('string');
        clientId = response.body.user.id;
      })
      .then(() => cy.loginAsAdmin(adminEmail, adminPassword))
      .then(({ token }) => {
        adminToken = token;
        return cy.generateTicketForUser(token, clientId, 5);
      })
      .then((ticket) => {
        ticketCode = ticket.codigoQR;
      });
  });

  it('Cliente visualiza su ticket y el historial se actualiza al validarlo', () => {
    cy.loginAsClient(clientEmail, clientPassword).then(({ token, user }) => {
      cy.visit('/app/mis-tickets', {
        onBeforeLoad(win) {
          const session = {
            type: 'user',
            token,
            profile: user,
          };
          win.localStorage.setItem('lasextaapp:userSession', JSON.stringify(session));
        },
      });
    });

    cy.contains('Mis Tickets').should('be.visible');
    cy.contains('Ticket disponible').should('be.visible');
    cy.contains(ticketCode).should('be.visible');
    cy.contains('Ampliar QR').click();
    cy.get('.ticket-modal').within(() => {
      cy.contains(ticketCode).should('be.visible');
    });
    cy.get('ion-button').contains('Cerrar').click({ force: true });

    cy.validateTicketCode(adminToken, ticketCode);
    cy.reload();

    cy.contains('Sin tickets disponibles').should('be.visible');
    cy.contains('Historial de tickets').should('be.visible');
    cy.contains(ticketCode).should('be.visible');
    cy.contains('Usado / Expirado').should('be.visible');
  });
});

