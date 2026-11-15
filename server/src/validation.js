class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function text(value, label, max = 500, required = false) {
  if (typeof value !== "string") {
    if (!required && value == null) return "";
    throw new ApiError(400, `${label} must be text.`);
  }
  const result = value.trim();
  if ((required && !result) || result.length > max) {
    throw new ApiError(400, `${label} is required and must be no more than ${max} characters.`);
  }
  return result;
}

function validId(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)
  ) {
    throw new ApiError(400, `${label} is invalid.`);
  }
  return value;
}

function integer(value, label, min = 0, max = 100000000) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, `${label} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function email(value) {
  const result = text(value, "Email address", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  return result;
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
    throw new ApiError(400, "A request must contain between 1 and 30 items.");
  }
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, "Each requested item must be an object.");
    }
    const quantity = integer(item.quantity, "Item quantity", 1, 99);
    if (item.productId && !item.customDetails) {
      return { productId: validId(item.productId, "Product ID"), quantity };
    }
    if (!item.customDetails || item.productId) {
      throw new ApiError(400, "Each requested item must be a product or a custom hamper.");
    }

    const details = item.customDetails;
    if (!Array.isArray(details.contents) || details.contents.length < 1 || details.contents.length > 20) {
      throw new ApiError(400, "A custom hamper must contain between 1 and 20 products.");
    }
    return {
      quantity,
      customDetails: {
        boxId: validId(details.boxId, "Gift box"),
        contents: details.contents.map((content) => ({
          productId: validId(content.productId, "Product ID"),
          quantity: integer(content.quantity, "Product quantity", 1, 99),
        })),
        personalisation: {
          recipient: text(details.personalisation?.recipient, "Recipient", 50),
          occasion: text(details.personalisation?.occasion, "Occasion", 80),
          giftMessage: text(details.personalisation?.giftMessage, "Gift message", 180),
          specialInstructions: text(details.personalisation?.specialInstructions, "Special instructions", 250),
        },
      },
    };
  });
}

function calculateOrderEstimate(items, productsById, settings) {
  let subtotalMinor = 0;
  for (const item of items) {
    if (item.productId) {
      const product = productsById.get(item.productId);
      if (!product || product.status !== "active") {
        throw new ApiError(400, "A selected product is no longer available.");
      }
      subtotalMinor += product.priceMinor * item.quantity;
      continue;
    }

    const box = settings.boxes[item.customDetails.boxId];
    if (!box) throw new ApiError(400, "The selected gift box is not available.");
    const itemCount = item.customDetails.contents.reduce(
      (count, content) => count + content.quantity,
      0,
    );
    if (itemCount > box.maxItems) {
      throw new ApiError(400, "The custom hamper contains too many products for its box.");
    }
    let hamperMinor = box.priceMinor;
    for (const content of item.customDetails.contents) {
      const product = productsById.get(content.productId);
      if (!product || product.status !== "active" || product.productType !== "component") {
        throw new ApiError(400, "A selected hamper product is no longer available.");
      }
      hamperMinor += product.priceMinor * content.quantity;
    }
    subtotalMinor += hamperMinor * item.quantity;
  }

  const deliveryMinor =
    subtotalMinor > 0 && subtotalMinor < settings.delivery.freeThresholdMinor
      ? settings.delivery.standardDeliveryMinor
      : 0;
  return subtotalMinor + deliveryMinor;
}

module.exports = { ApiError, calculateOrderEstimate, email, integer, normalizeOrderItems, text, validId };
