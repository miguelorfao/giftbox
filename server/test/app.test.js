const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createApi } = require("../src/app");

async function startApi(t, database, env) {
  const app = createApi({ database, env });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}/api`;
}

test("admin routes reject requests without an administrator token", async (t) => {
  const apiUrl = await startApi(t, { findAdmin: async () => null }, { JWT_SECRET: "a-secure-test-secret" });
  const response = await fetch(`${apiUrl}/admin/data`);
  assert.equal(response.status, 401);
});

test("admin login returns a token accepted by the session endpoint", async (t) => {
  const passwordHash = await bcrypt.hash("safe-test-password", 4);
  const database = {
    findAdmin: async (email) =>
      email === "admin@example.com"
        ? {
            email,
            role: "admin",
            passwordHash,
          }
        : null,
  };
  const apiUrl = await startApi(t, database, {
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_PASSWORD_HASH: passwordHash,
    JWT_SECRET: "a-secure-test-secret",
  });

  const loginResponse = await fetch(`${apiUrl}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "ADMIN@example.com",
      password: "safe-test-password",
    }),
  });
  assert.equal(loginResponse.status, 200);
  const { token } = await loginResponse.json();
  const sessionResponse = await fetch(`${apiUrl}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(sessionResponse.status, 200);
  assert.deepEqual(await sessionResponse.json(), { email: "admin@example.com" });
});

test("unknown API routes return JSON instead of the storefront page", async (t) => {
  const apiUrl = await startApi(t, {}, {});
  const response = await fetch(`${apiUrl}/missing`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "API route not found." });
});

test("checkout prices products from the database before creating the request", async (t) => {
  let createdOrder;
  const database = {
    getSettings: async () => null,
    getProductsByIds: async (ids) => {
      assert.deepEqual(ids, ["birthday-box"]);
      return [
        {
          id: "birthday-box",
          status: "active",
          priceMinor: 2800,
        },
      ];
    },
    createOrder: async (order) => {
      createdOrder = order;
      return { id: "GH-1001", reference: "GH-1001" };
    },
  };
  const apiUrl = await startApi(t, database, {});
  const response = await fetch(`${apiUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: {
        name: "Casey Gift",
        email: "casey@example.com",
        telephone: "020 1234 5678",
      },
      deliveryAddress: {
        line1: "1 Gift Lane",
        city: "London",
        postcode: "N1 1AA",
      },
      items: [{ productId: "birthday-box", quantity: 1 }],
    }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: "GH-1001",
    reference: "GH-1001",
    estimatedTotalMinor: 3295,
  });
  assert.equal(createdOrder.customer.email, "casey@example.com");
});
