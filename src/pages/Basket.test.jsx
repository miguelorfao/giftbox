import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CartProvider } from "../context/CartContext";
import Basket from "./Basket";

beforeEach(() => {
  localStorage.setItem(
    "hamper-cart",
    JSON.stringify([
      {
        id: "test-hamper",
        name: "The Test Hamper",
        price: 30,
        quantity: 1,
      },
    ]),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [],
          categories: [],
          settings: { delivery: {}, announcement: {}, boxes: {} },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reference: "GH-1001",
          estimatedTotalMinor: 3295,
        }),
      }),
  );
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("checkout submits basket details and displays the server reference", async () => {
  render(
    <MemoryRouter>
      <CartProvider>
        <Basket />
      </CartProvider>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Casey Gift" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "casey@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Telephone"), {
    target: { value: "020 1234 5678" },
  });
  fireEvent.change(screen.getByLabelText("Address line 1"), {
    target: { value: "1 Gift Lane" },
  });
  fireEvent.change(screen.getByLabelText("Town or city"), {
    target: { value: "London" },
  });
  fireEvent.change(screen.getByLabelText("Postcode"), {
    target: { value: "N1 1AA" },
  });
  fireEvent.submit(screen.getByLabelText("Full name").closest("form"));

  expect(await screen.findByText("Reference: GH-1001")).toBeInTheDocument();
  expect(screen.getByText("Estimated total: £32.95")).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/orders",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"productId":"test-hamper"'),
    }),
  );
});
