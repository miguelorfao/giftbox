const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ApiError,
  calculateOrderEstimate,
  normalizeOrderItems,
} = require("../src/validation");

test("normalizes ready-made and custom hamper items", () => {
  const items = normalizeOrderItems([
    { productId: "birthday-box", quantity: 2 },
    {
      quantity: 1,
      customDetails: {
        boxId: "small",
        contents: [{ productId: "candle", quantity: 1 }],
      },
    },
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[1].customDetails.personalisation.giftMessage, "");
});

test("computes product, box, and delivery estimates from database catalog prices", () => {
  const items = normalizeOrderItems([
    { productId: "ready-box", quantity: 1 },
    {
      quantity: 1,
      customDetails: {
        boxId: "small",
        contents: [{ productId: "candle", quantity: 2 }],
      },
    },
  ]);
  const products = new Map([
    ["ready-box", { status: "active", priceMinor: 2800 }],
    ["candle", { status: "active", productType: "component", priceMinor: 400 }],
  ]);
  const settings = {
    boxes: { small: { priceMinor: 600, maxItems: 3 } },
    delivery: { standardDeliveryMinor: 495, freeThresholdMinor: 5000 },
  };

  assert.equal(calculateOrderEstimate(items, products, settings), 4200 + 495);
});

test("rejects orders containing inactive products", () => {
  const items = normalizeOrderItems([{ productId: "retired", quantity: 1 }]);
  assert.throws(
    () =>
      calculateOrderEstimate(
        items,
        new Map([["retired", { status: "draft", priceMinor: 100 }]]),
        { boxes: {}, delivery: { standardDeliveryMinor: 0, freeThresholdMinor: 1 } },
      ),
    (error) => error instanceof ApiError && error.status === 400,
  );
});
