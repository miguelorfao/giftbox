# Giftbox

The Vite/React storefront and its Node/Express API are deployed together on Render. MySQL/MariaDB stores the catalog, categories, orders, shop settings, administrator account, and uploaded images. phpMyAdmin can be used to manage the database.

The database starts empty; catalog and order data are not imported automatically. Add categories and products from the administrator page after setup.

## MySQL/MariaDB setup

1. In your hosting control panel, create a database and a dedicated database user. Grant that user access to the database. phpMyAdmin is the web management tool; it is not the database server or hostname.
2. Ensure the database provider allows remote connections from Render. Use the database hostname from the provider, not the phpMyAdmin URL. Enable TLS if required by the provider.
3. Configure the Render service from `render.yaml` with:

   | Variable | Value |
   |---|---|
   | `MYSQL_HOST` | Database server hostname |
   | `MYSQL_PORT` | Usually `3306` |
   | `MYSQL_USER` | Database username |
   | `MYSQL_PASSWORD` | Database password |
   | `MYSQL_DATABASE` | Database name |
   | `MYSQL_SSL` | `true` when required; otherwise `false` |
   | `ADMIN_EMAIL` | New administrator email |
   | `ADMIN_PASSWORD_HASH` | Bcrypt hash generated below |
   | `JWT_SECRET` | Use Render's generated value |

   Keep credentials in Render's environment settings, not in source files or chat. The API creates its tables on startup; the database user needs permission to create tables and indexes.

4. Generate the administrator password hash locally:

   ```powershell
   cd server
   npm install
   npm run hash-password
   ```

   Use a password of at least 12 characters. Copy the hash output into Render's `ADMIN_PASSWORD_HASH` setting.

## Local development

1. Copy `server/.env.example` to `server/.env` and set your MySQL connection values, administrator email, password hash, and a long random `JWT_SECRET`.
2. Start the API:

   ```powershell
   cd server
   npm install
   npm start
   ```

3. In a second terminal, install dependencies from the project root and run `npm start`. Vite proxies `/api` to `http://localhost:5000`.
4. Check `http://localhost:5000/api/health`. Open `/dashboard` or `/admin` to sign in and manage the shop.

Uploaded JPEG, PNG, and WebP files (up to 5 MB) are stored as binary data in MySQL. Orders are requests only: stock is not reserved, and payment is not taken until the shop confirms the order.

The EmailJS status-update flow uses these optional Vite variables in `.env.local`:

```env
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

## Validation

```powershell
npm test -- --run
npm run build
npm --prefix server test
```
