import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createOrderRequest, loginAdmin } from "./storeApi";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reference: "GH-1001",
        estimatedTotalMinor: 3295,
      }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("checkout posts customer and selected items to the API", async () => {
  const result = await createOrderRequest({
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
    items: [{ productId: "birthday-hamper", quantity: 1 }],
  });

  expect(result).toEqual({
    reference: "GH-1001",
    estimatedTotalMinor: 3295,
  });
  expect(fetch).toHaveBeenCalledWith(
    "/api/orders",
    expect.objectContaining({
      method: "POST",
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
        items: [{ productId: "birthday-hamper", quantity: 1 }],
      }),
    }),
  );
});

test("login explains when the API cannot be reached", async () => {
  fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

  await expect(loginAdmin("admin@example.com", "password")).rejects.toThrow(
    "Cannot reach the shop API. Start the API server and check its MySQL settings.",
  );
});
