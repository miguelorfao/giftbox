import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            id: "test-hamper",
            name: "The Test Hamper",
            description: "A test gift.",
            priceMinor: 3000,
            image: "",
            stockQuantity: 4,
            status: "active",
            productType: "ready_made",
            categoryIds: ["birthday"],
            featured: true,
          },
        ],
        categories: [{ id: "birthday", name: "Birthday" }],
        settings: { delivery: {}, announcement: {}, boxes: {} },
      }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('renders the home page', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: /gifts that make/i })
  ).toBeInTheDocument();
});

test("loads featured products from the API catalog", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "The Test Hamper" }),
  ).toBeInTheDocument();
  expect(screen.getByText("£30.00")).toBeInTheDocument();
});
