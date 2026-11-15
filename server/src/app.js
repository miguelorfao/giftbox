const bcrypt = require("bcryptjs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  ApiError,
  calculateOrderEstimate,
  email,
  integer,
  normalizeOrderItems,
  text,
  validId,
} = require("./validation");

const defaultSettings = {
  business: { name: "The Gift Collection", contactEmail: "", telephone: "" },
  announcement: {
    enabled: true,
    text: "A little something, delivered with love ✳ Free UK delivery over £50",
  },
  delivery: {
    standardDeliveryMinor: 495,
    freeThresholdMinor: 5000,
    areas: [],
    instructions: "Packed with care and sent across the UK.",
    estimatedDeliveryDays: 3,
  },
  boxes: {
    small: { name: "Little", priceMinor: 600, maxItems: 3 },
    medium: { name: "Classic", priceMinor: 900, maxItems: 5 },
    large: { name: "Big love", priceMinor: 1300, maxItems: 8 },
    luxury: { name: "The grand one", priceMinor: 1800, maxItems: 12 },
  },
};

const requestStatuses = [
  "received",
  "accepted",
  "payment_received",
  "cancellation",
  "completed",
  "out_for_delivery",
];
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(new ApiError(400, "Upload a JPEG, PNG, or WebP image."));
      return;
    }
    callback(null, true);
  },
});

function validImageSignature(buffer, contentType) {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function mergeSettings(saved = {}) {
  return {
    ...defaultSettings,
    ...saved,
    business: { ...defaultSettings.business, ...(saved.business || {}) },
    announcement: {
      ...defaultSettings.announcement,
      ...(saved.announcement || {}),
    },
    delivery: { ...defaultSettings.delivery, ...(saved.delivery || {}) },
    boxes: Object.fromEntries(
      Object.entries(defaultSettings.boxes).map(([id, defaults]) => [
        id,
        { ...defaults, ...(saved.boxes?.[id] || {}) },
      ]),
    ),
  };
}

function publicSettingsDocument(settings) {
  const { id, _id, updatedAt, ...data } = settings || {};
  return data;
}

function validImageReference(value) {
  const image = text(value, "Image", 600);
  if (!image) return "";
  if (image.startsWith("mysql:")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(image.slice(6))) {
      throw new ApiError(400, "The uploaded image reference is invalid.");
    }
    return image;
  }
  if (/^https:\/\//i.test(image) || /^[a-zA-Z0-9_-]{1,160}$/.test(image)) {
    return image;
  }
  throw new ApiError(400, "Use an uploaded image, HTTPS URL, or catalog image ID.");
}

function normalizeProduct(body) {
  if (!body || typeof body !== "object") throw new ApiError(400, "Product data is required.");
  if (!Array.isArray(body.categoryIds) || body.categoryIds.length > 50) {
    throw new ApiError(400, "Choose valid product categories.");
  }
  const status = body.status;
  if (!["active", "out_of_stock", "draft"].includes(status)) {
    throw new ApiError(400, "Product status is invalid.");
  }
  const productType = body.productType;
  if (!["ready_made", "component"].includes(productType)) {
    throw new ApiError(400, "Product type is invalid.");
  }
  return {
    name: text(body.name, "Product name", 120, true),
    description: text(body.description, "Product description", 2000),
    priceMinor: integer(body.priceMinor, "Product price"),
    image: validImageReference(body.image),
    sku: text(body.sku, "SKU", 80),
    stockQuantity: integer(body.stockQuantity, "Stock quantity", 0, 1000000),
    status,
    productType,
    categoryIds: [...new Set(body.categoryIds.map((id) => validId(id, "Category ID")))],
    featured: body.featured === true,
    note: text(body.note, "Product note", 300),
  };
}

function normalizeCategory(body) {
  if (!body || typeof body !== "object") throw new ApiError(400, "Category data is required.");
  if (!["active", "inactive"].includes(body.status)) {
    throw new ApiError(400, "Category status is invalid.");
  }
  return {
    name: text(body.name, "Category name", 120, true),
    description: text(body.description, "Category description", 500),
    image: validImageReference(body.image),
    displayOrder: integer(body.displayOrder, "Display order", 0, 100000),
    status: body.status,
  };
}

function normalizeSettings(body, existing) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "Shop settings are required.");
  }
  const saved = mergeSettings({ ...existing, ...body });
  const business = body.business || {};
  const announcement = body.announcement || {};
  const delivery = body.delivery || {};
  const boxes = body.boxes || {};

  return {
    business: {
      name: text(business.name ?? saved.business.name, "Business name", 120, true),
      contactEmail: business.contactEmail
        ? email(business.contactEmail)
        : "",
      telephone: text(business.telephone ?? saved.business.telephone, "Telephone", 50),
    },
    announcement: {
      enabled:
        typeof announcement.enabled === "boolean"
          ? announcement.enabled
          : saved.announcement.enabled,
      text: text(announcement.text ?? saved.announcement.text, "Announcement", 180),
    },
    delivery: {
      standardDeliveryMinor: integer(
        delivery.standardDeliveryMinor ?? saved.delivery.standardDeliveryMinor,
        "Standard delivery",
      ),
      freeThresholdMinor: integer(
        delivery.freeThresholdMinor ?? saved.delivery.freeThresholdMinor,
        "Free delivery threshold",
      ),
      areas: Array.isArray(delivery.areas)
        ? delivery.areas.map((area) => text(area, "Delivery area", 20, true)).slice(0, 100)
        : saved.delivery.areas,
      instructions: text(
        delivery.instructions ?? saved.delivery.instructions,
        "Delivery instructions",
        500,
      ),
      estimatedDeliveryDays: integer(
        delivery.estimatedDeliveryDays ?? saved.delivery.estimatedDeliveryDays,
        "Estimated delivery days",
        1,
        90,
      ),
    },
    boxes: Object.fromEntries(
      Object.entries(defaultSettings.boxes).map(([id, defaults]) => {
        const box = boxes[id] || saved.boxes[id] || defaults;
        return [
          id,
          {
            name: text(box.name, "Gift box name", 60, true),
            priceMinor: integer(box.priceMinor, "Gift box price"),
            maxItems: integer(box.maxItems, "Maximum box items", 1, 20),
          },
        ];
      }),
    ),
  };
}

function normalizeBankDetails(body) {
  return {
    accountName: text(body.accountName, "Account name", 120),
    bankName: text(body.bankName, "Bank name", 120),
    sortCode: text(body.sortCode, "Sort code", 20),
    accountNumber: text(body.accountNumber, "Account number", 34),
    paymentInstructions: text(body.paymentInstructions, "Payment instructions", 500),
  };
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function createApi({ database, env = process.env }) {
  const app = express();
  const api = express.Router();

  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  const adminOnly = (request, response, next) => {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return next(new ApiError(401, "Administrator sign-in is required."));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (
        payload.role !== "admin" ||
        payload.email !== String(env.ADMIN_EMAIL || "").toLowerCase()
      ) {
        return next(new ApiError(403, "Administrator access is required."));
      }
      request.admin = { email: payload.email };
      return next();
    } catch {
      return next(new ApiError(401, "Your administrator session has expired. Sign in again."));
    }
  };

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  api.get("/health", (request, response) => response.json({ status: "ok" }));

  api.get(
    "/catalog",
    asyncRoute(async (request, response) => {
      const { products, categories, settings: settingsDocument } =
        await database.getCatalog();
      response.json({
        products,
        categories,
        settings: mergeSettings(publicSettingsDocument(settingsDocument)),
      });
    }),
  );

  api.post(
    "/orders",
    orderLimiter,
    asyncRoute(async (request, response) => {
      const input = request.body || {};
      const customer = input.customer || {};
      const address = input.deliveryAddress || {};
      const normalizedItems = normalizeOrderItems(input.items);
      const [settingsDocument, products] = await Promise.all([
        database.getSettings("public"),
        database.getProductsByIds(
          normalizedItems.flatMap((item) =>
            item.productId
              ? [item.productId]
              : item.customDetails.contents.map((content) => content.productId),
          ),
        ),
      ]);
      const settings = mergeSettings(publicSettingsDocument(settingsDocument));
      const estimatedTotalMinor = calculateOrderEstimate(
        normalizedItems,
        new Map(products.map((product) => [product.id, product])),
        settings,
      );
      const order = await database.createOrder({
        estimatedTotalMinor,
        customer: {
          name: text(customer.name, "Full name", 120, true),
          email: email(customer.email),
          telephone: text(customer.telephone, "Telephone", 40, true),
        },
        deliveryAddress: {
          line1: text(address.line1, "Address line 1", 150, true),
          line2: text(address.line2, "Address line 2", 150),
          city: text(address.city, "Town or city", 100, true),
          postcode: text(address.postcode, "Postcode", 20, true).toUpperCase(),
          instructions: text(address.instructions, "Delivery instructions", 500),
          preferredDate: text(address.preferredDate, "Preferred delivery date", 10),
        },
        items: normalizedItems,
      });
      response.status(201).json({
        id: order.id,
        reference: order.reference,
        estimatedTotalMinor,
      });
    }),
  );

  api.post(
    "/admin/login",
    loginLimiter,
    asyncRoute(async (request, response) => {
      if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH || !env.JWT_SECRET) {
        throw new ApiError(503, "Administrator login is not configured on the API.");
      }
      const submittedEmail = String(request.body?.email || "").trim().toLowerCase();
      const submittedPassword = String(request.body?.password || "");
      const administrator = await database.findAdmin(submittedEmail);
      const passwordMatches = administrator
        ? await bcrypt.compare(submittedPassword, administrator.passwordHash)
        : false;
      if (!administrator || !passwordMatches) {
        throw new ApiError(401, "Email or password is incorrect.");
      }
      const token = jwt.sign(
        { email: submittedEmail, role: "admin" },
        env.JWT_SECRET,
        { expiresIn: "8h" },
      );
      response.json({ token, user: { email: submittedEmail } });
    }),
  );

  api.get("/admin/me", adminOnly, (request, response) => {
    response.json({ email: request.admin.email });
  });

  api.get(
    "/admin/data",
    adminOnly,
    asyncRoute(async (request, response) => {
      const {
        requests,
        products,
        categories,
        settings: publicSettings,
        privateSettings,
      } = await database.getAdminData();
      response.json({
        requests,
        products,
        categories,
        settings: mergeSettings(publicSettingsDocument(publicSettings)),
        privateSettings: {
          bankDetails: privateSettings?.bankDetails || {
            accountName: "",
            bankName: "",
            sortCode: "",
            accountNumber: "",
            paymentInstructions: "",
          },
        },
        dashboard: {
          totalRequests: requests.length,
          newRequests: requests.filter((order) =>
            ["new", "received"].includes(order.status),
          ).length,
          activeProducts: products.filter(
            (product) => product.status === "active",
          ).length,
          lowStockProducts: products.filter(
            (product) =>
              product.status === "active" && product.stockQuantity <= 5,
          ).length,
        },
      });
    }),
  );

  api.get(
    "/admin/orders/:id",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Order request ID");
      const order = await database.getOrder(id);
      if (!order) throw new ApiError(404, "Order request not found.");
      response.json(order);
    }),
  );

  api.patch(
    "/admin/orders/:id/status",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Order request ID");
      const { status, confirmedTotalMinor } = request.body || {};
      if (!requestStatuses.includes(status)) throw new ApiError(400, "Order status is invalid.");
      const current = await database.getOrder(id);
      if (!current) throw new ApiError(404, "Order request not found.");
      if (status === "accepted") integer(confirmedTotalMinor, "Confirmed total", 1);
      if (status === "payment_received" && !current.confirmedTotalMinor) {
        throw new ApiError(400, "Accept the request and record its confirmed total before marking payment received.");
      }
      const updated = await database.updateOrderStatus(
        id,
        status,
        status === "accepted" ? confirmedTotalMinor : undefined,
      );
      response.json(updated);
    }),
  );

  api.post(
    "/admin/orders/:id/status-email",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Order request ID");
      const { status } = request.body || {};
      if (!requestStatuses.includes(status)) throw new ApiError(400, "Order status is invalid.");
      const recorded = await database.recordStatusEmail(id, status);
      if (!recorded) throw new ApiError(409, "The order status changed before its email was recorded.");
      response.json({ ok: true });
    }),
  );

  api.put(
    "/admin/products/:id",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Product ID");
      const product = normalizeProduct(request.body);
      await database.saveProduct(id, product);
      response.json({ id, ...product });
    }),
  );

  api.patch(
    "/admin/products/:id/archive",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Product ID");
      if (!(await database.archiveProduct(id))) {
        throw new ApiError(404, "Product not found.");
      }
      response.json({ ok: true });
    }),
  );

  api.put(
    "/admin/categories/:id",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Category ID");
      const category = normalizeCategory(request.body);
      await database.saveCategory(id, category);
      response.json({ id, ...category });
    }),
  );

  api.patch(
    "/admin/categories/:id/archive",
    adminOnly,
    asyncRoute(async (request, response) => {
      const id = validId(request.params.id, "Category ID");
      if (!(await database.archiveCategory(id))) {
        throw new ApiError(404, "Category not found.");
      }
      response.json({ ok: true });
    }),
  );

  api.put(
    "/admin/settings",
    adminOnly,
    asyncRoute(async (request, response) => {
      const existing = publicSettingsDocument(await database.getSettings("public"));
      const settings = normalizeSettings(request.body, existing);
      await database.savePublicSettings(settings);
      response.json(settings);
    }),
  );

  api.put(
    "/admin/settings/private",
    adminOnly,
    asyncRoute(async (request, response) => {
      const bankDetails = normalizeBankDetails(request.body || {});
      await database.saveBankDetails(bankDetails);
      response.json({ bankDetails });
    }),
  );

  api.post(
    "/admin/images",
    adminOnly,
    imageUpload.single("image"),
    asyncRoute(async (request, response) => {
      if (!request.file) throw new ApiError(400, "Choose an image to upload.");
      if (!validImageSignature(request.file.buffer, request.file.mimetype)) {
        throw new ApiError(400, "The uploaded file does not match its image type.");
      }
      const id = crypto.randomUUID();
      await database.saveImage({
        id,
        filename: request.file.originalname.slice(0, 255),
        contentType: request.file.mimetype,
        data: request.file.buffer,
      });
      response.status(201).json({ image: `mysql:${id}` });
    }),
  );

  api.get(
    "/images/:id",
    asyncRoute(async (request, response) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
        throw new ApiError(404, "Image not found.");
      }
      const file = await database.getImage(request.params.id);
      if (!file) throw new ApiError(404, "Image not found.");
      const contentType = file.contentType;
      if (!allowedImageTypes.has(contentType)) throw new ApiError(404, "Image not found.");
      response.setHeader("Content-Type", contentType);
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      response.send(file.data);
    }),
  );

  api.use((request, response) =>
    response.status(404).json({ error: "API route not found." }),
  );
  app.use("/api", api);
  const buildDirectory = path.resolve(__dirname, "../../dist");
  if (fs.existsSync(path.join(buildDirectory, "index.html"))) {
    app.use(express.static(buildDirectory));
    app.get("*", (request, response) => {
      response.sendFile(path.join(buildDirectory, "index.html"));
    });
  }
  app.use((request, response) => response.status(404).json({ error: "API route not found." }));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const status = error instanceof ApiError ? error.status : error instanceof multer.MulterError ? 400 : 500;
    if (status >= 500) console.error("API request failed.", error);
    response.status(status).json({
      error: status >= 500 ? "The request could not be completed. Please try again." : error.message,
    });
  });

  return app;
}

module.exports = { createApi };
