const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

function jsonValue(value, fallback) {
  if (value == null) return fallback;
  if (Buffer.isBuffer(value)) value = value.toString("utf8");
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    image: row.image,
    sku: row.sku,
    stockQuantity: row.stock_quantity,
    status: row.status,
    productType: row.product_type,
    categoryIds: jsonValue(row.category_ids, []),
    featured: Boolean(row.featured),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    image: row.image,
    displayOrder: row.display_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    reference: row.reference,
    estimatedTotalMinor: row.estimated_total_minor,
    confirmedTotalMinor: row.confirmed_total_minor,
    customer: jsonValue(row.customer, {}),
    deliveryAddress: jsonValue(row.delivery_address, {}),
    items: jsonValue(row.items, []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastStatusEmail: row.last_status_email,
    lastStatusEmailSentAt: row.last_status_email_sent_at,
  };
}

function mapSettings(row) {
  if (!row) return null;
  return {
    id: row.id,
    business: jsonValue(row.business, {}),
    announcement: jsonValue(row.announcement, {}),
    delivery: jsonValue(row.delivery, {}),
    boxes: jsonValue(row.boxes, {}),
    bankDetails: jsonValue(row.bank_details, {}),
    updatedAt: row.updated_at,
  };
}

function createDatabase(pool) {
  async function getProductsByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      ids,
    );
    return rows.map(mapProduct);
  }

  async function getOrder(id) {
    const [rows] = await pool.execute(
      "SELECT * FROM order_requests WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? mapOrder(rows[0]) : null;
  }

  async function getSettings(id) {
    const [rows] = await pool.execute(
      "SELECT * FROM settings WHERE id = ? LIMIT 1",
      [id],
    );
    return mapSettings(rows[0]);
  }

  async function archive(table, id, status) {
    await pool.execute(
      `UPDATE ${table} SET status = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [status, id],
    );
    const [rows] = await pool.execute(
      `SELECT id FROM ${table} WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0;
  }

  return {
    async ensureAdmin(email, passwordHash) {
      await pool.execute(
        `INSERT INTO admins (email, password_hash, role)
         VALUES (?, ?, 'admin')
         ON DUPLICATE KEY UPDATE email = VALUES(email)`,
        [email, passwordHash],
      );
    },

    async findAdmin(email) {
      const [rows] = await pool.execute(
        "SELECT email, password_hash, role FROM admins WHERE email = ? LIMIT 1",
        [email],
      );
      if (!rows[0]) return null;
      return {
        email: rows[0].email,
        passwordHash: rows[0].password_hash,
        role: rows[0].role,
      };
    },

    async getCatalog() {
      const [productRows] = await pool.execute(
        `SELECT * FROM products
         WHERE status IN ('active', 'out_of_stock')
         ORDER BY name
         LIMIT 200`,
      );
      const [categoryRows] = await pool.execute(
        `SELECT * FROM categories
         WHERE status = 'active'
         ORDER BY display_order
         LIMIT 200`,
      );
      return {
        products: productRows.map(mapProduct),
        categories: categoryRows.map(mapCategory),
        settings: await getSettings("public"),
      };
    },

    getProductsByIds,

    async createOrder(order) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          "INSERT IGNORE INTO counters (name, value) VALUES ('orderRequests', 1000)",
        );
        await connection.execute(
          "UPDATE counters SET value = value + 1 WHERE name = 'orderRequests'",
        );
        const [counterRows] = await connection.execute(
          "SELECT value FROM counters WHERE name = 'orderRequests' LIMIT 1",
        );
        const reference = `GH-${counterRows[0].value}`;
        const createdAt = new Date();
        await connection.execute(
          `INSERT INTO order_requests
           (id, reference, estimated_total_minor, customer, delivery_address, items, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'received', ?)`,
          [
            reference,
            reference,
            order.estimatedTotalMinor,
            JSON.stringify(order.customer),
            JSON.stringify(order.deliveryAddress),
            JSON.stringify(order.items),
            createdAt,
          ],
        );
        await connection.commit();
        return { id: reference, reference, createdAt };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async getAdminData() {
      const [orderRows] = await pool.execute(
        "SELECT * FROM order_requests ORDER BY created_at DESC LIMIT 500",
      );
      const [productRows] = await pool.execute(
        "SELECT * FROM products ORDER BY name LIMIT 500",
      );
      const [categoryRows] = await pool.execute(
        "SELECT * FROM categories ORDER BY display_order LIMIT 200",
      );
      return {
        requests: orderRows.map(mapOrder),
        products: productRows.map(mapProduct),
        categories: categoryRows.map(mapCategory),
        settings: await getSettings("public"),
        privateSettings: await getSettings("private"),
      };
    },

    getOrder,

    async updateOrderStatus(id, status, confirmedTotalMinor) {
      if (Number.isInteger(confirmedTotalMinor)) {
        await pool.execute(
          `UPDATE order_requests
           SET status = ?, confirmed_total_minor = ?, updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [status, confirmedTotalMinor, id],
        );
      } else {
        await pool.execute(
          `UPDATE order_requests
           SET status = ?, updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [status, id],
        );
      }
      return getOrder(id);
    },

    async recordStatusEmail(id, status) {
      await pool.execute(
        `UPDATE order_requests
         SET last_status_email = ?, last_status_email_sent_at = CURRENT_TIMESTAMP(3),
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND status = ?`,
        [status, id, status],
      );
      const [rows] = await pool.execute(
        "SELECT id FROM order_requests WHERE id = ? AND status = ? LIMIT 1",
        [id, status],
      );
      return rows.length > 0;
    },

    async saveProduct(id, product) {
      await pool.execute(
        `INSERT INTO products
         (id, name, description, price_minor, image, sku, stock_quantity, status,
          product_type, category_ids, featured, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name), description = VALUES(description),
          price_minor = VALUES(price_minor), image = VALUES(image), sku = VALUES(sku),
          stock_quantity = VALUES(stock_quantity), status = VALUES(status),
          product_type = VALUES(product_type), category_ids = VALUES(category_ids),
          featured = VALUES(featured), note = VALUES(note),
          updated_at = CURRENT_TIMESTAMP(3)`,
        [
          id,
          product.name,
          product.description,
          product.priceMinor,
          product.image,
          product.sku,
          product.stockQuantity,
          product.status,
          product.productType,
          JSON.stringify(product.categoryIds),
          product.featured,
          product.note,
        ],
      );
    },

    archiveProduct(id) {
      return archive("products", id, "draft");
    },

    async saveCategory(id, category) {
      await pool.execute(
        `INSERT INTO categories
         (id, name, description, image, display_order, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name), description = VALUES(description),
          image = VALUES(image), display_order = VALUES(display_order),
          status = VALUES(status), updated_at = CURRENT_TIMESTAMP(3)`,
        [
          id,
          category.name,
          category.description,
          category.image,
          category.displayOrder,
          category.status,
        ],
      );
    },

    archiveCategory(id) {
      return archive("categories", id, "inactive");
    },

    savePublicSettings(settings) {
      return pool.execute(
        `INSERT INTO settings (id, business, announcement, delivery, boxes)
         VALUES ('public', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          business = VALUES(business), announcement = VALUES(announcement),
          delivery = VALUES(delivery), boxes = VALUES(boxes),
          updated_at = CURRENT_TIMESTAMP(3)`,
        [
          JSON.stringify(settings.business),
          JSON.stringify(settings.announcement),
          JSON.stringify(settings.delivery),
          JSON.stringify(settings.boxes),
        ],
      );
    },

    async saveBankDetails(bankDetails) {
      await pool.execute(
        `INSERT INTO settings (id, bank_details)
         VALUES ('private', ?)
         ON DUPLICATE KEY UPDATE
          bank_details = VALUES(bank_details), updated_at = CURRENT_TIMESTAMP(3)`,
        [JSON.stringify(bankDetails)],
      );
    },

    async saveImage({ id, filename, contentType, data }) {
      await pool.execute(
        `INSERT INTO images (id, filename, content_type, data)
         VALUES (?, ?, ?, ?)`,
        [id, filename, contentType, data],
      );
    },

    async getImage(id) {
      const [rows] = await pool.execute(
        "SELECT content_type, data FROM images WHERE id = ? LIMIT 1",
        [id],
      );
      return rows[0]
        ? { contentType: rows[0].content_type, data: rows[0].data }
        : null;
    },

    async close() {
      await pool.end();
    },
  };
}

async function connectToDatabase(env = process.env) {
  const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`);
  }

  const pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
    ...(env.MYSQL_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  });

  try {
    await pool.query("SELECT 1");
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    for (const statement of schema.split(/;\s*(?:\r?\n|$)/).filter((part) => part.trim())) {
      await pool.query(statement);
    }
    return { database: createDatabase(pool) };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = { connectToDatabase };
