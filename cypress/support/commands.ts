/// <reference types="cypress" />

type AuthenticatedSession = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
  };
};

type GeneratedTicket = {
  id: string;
  codigoQR: string;
  fechaCreacion: string;
  fechaVencimiento: string | null;
};

function getApiUrl(): string {
  const configured = Cypress.env('apiUrl');
  return typeof configured === 'string' && configured.trim() !== ''
    ? configured
    : 'http://localhost:4000/api';
}

function requestAuth(path: string, body: Record<string, unknown>) {
  const url = `${getApiUrl()}${path}`;
  return cy.request<AuthenticatedSession>({
    method: 'POST',
    url,
    body,
    failOnStatusCode: false,
  });
}

Cypress.Commands.add('loginAsClient', (email: string, password: string) => {
  return requestAuth('/auth/login', { email, password }).then((response) => {
    expect(response.status, 'Código de respuesta login cliente').to.eq(200);
    expect(response.body.token, 'token de cliente').to.be.a('string').and.not.be.empty;
    return cy.wrap(response.body, { log: false });
  });
});

Cypress.Commands.add('loginAsAdmin', (email: string, password: string) => {
  return requestAuth('/admin/login', { email, password }).then((response) => {
    expect(response.status, 'Código de respuesta login admin').to.eq(200);
    expect(response.body.token, 'token de admin').to.be.a('string').and.not.be.empty;
    return cy.wrap(response.body, { log: false });
  });
});

Cypress.Commands.add('generateTicketForUser', (adminToken: string, userId: string, diasValidez = 7) => {
  const url = `${getApiUrl()}/admin/tickets/generate`;
  return cy
    .request<{
      ticket: GeneratedTicket;
    }>({
      method: 'POST',
      url,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: {
        userId,
        diasValidez,
      },
      failOnStatusCode: false,
    })
    .then((response) => {
      expect(response.status, 'Código de respuesta al generar ticket').to.eq(201);
      expect(response.body.ticket?.id, 'Ticket generado').to.be.a('string');
      return cy.wrap(response.body.ticket, { log: false });
    });
});

Cypress.Commands.add('validateTicketCode', (adminToken: string, codigoQR: string) => {
  const url = `${getApiUrl()}/admin/tickets/validate/${codigoQR}`;
  return cy
    .request<{
      ticket: GeneratedTicket;
    }>({
      method: 'POST',
      url,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      failOnStatusCode: false,
    })
    .then((response) => {
      expect(response.status, 'Código de respuesta al validar ticket').to.eq(200);
      return cy.wrap(response.body.ticket, { log: false });
    });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAsClient(email: string, password: string): Chainable<AuthenticatedSession>;
      loginAsAdmin(email: string, password: string): Chainable<AuthenticatedSession>;
      generateTicketForUser(adminToken: string, userId: string, diasValidez?: number): Chainable<GeneratedTicket>;
      validateTicketCode(adminToken: string, codigoQR: string): Chainable<GeneratedTicket>;
    }
  }
}

export {};