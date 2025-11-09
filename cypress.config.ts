import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    env: {
      apiUrl: "http://localhost:4000/api",
      adminEmail: "admin@example.com",
      adminPassword: "Admin123!",
      clientEmail: "cliente-demo@example.com",
      clientPassword: "Demo123!",
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});