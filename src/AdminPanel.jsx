import { useCallback, useEffect, useMemo, useState } from "react";
import {
  backendEnabled,
  archiveCategory,
  archiveProduct,
  getOrderRequest,
  getAdminSession,
  loadAdminData,
  loginAdmin,
  logoutAdmin,
  markStatusEmailSent,
  saveBankDetails,
  saveCategory,
  saveProduct,
  saveShopSettings,
  sendOrderStatusEmail,
  statusEmailConfigured,
  uploadImage,
  updateOrderRequest,
} from "./storeApi";
import "./AdminPanel.css";

const REQUEST_STATUSES = [
  ["received", "Received"],
  ["accepted", "Accepted"],
  ["payment_received", "Payment received"],
  ["cancellation", "Cancellation"],
  ["completed", "Completed"],
  ["out_for_delivery", "Out for delivery"],
];

const normalizeRequestStatus = (status) =>
  ({
    new: "received",
    contacted: "received",
    declined: "cancellation",
    cancelled: "cancellation",
    delivered: "completed",
  })[status] || status;
const requestStatusLabel = (status) =>
  REQUEST_STATUSES.find(
    ([value]) => value === normalizeRequestStatus(status),
  )?.[1] || status;

const EMPTY_PRODUCT = {
  id: "",
  name: "",
  description: "",
  price: "",
  image: "",
  sku: "",
  stockQuantity: "0",
  status: "draft",
  productType: "ready_made",
  categoryIds: [],
  featured: false,
  note: "",
};

const money = (minor = 0) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    minor / 100,
  );
const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
const dateText = (value) => {
  const date =
    value && typeof value.toDate === "function"
      ? value.toDate()
      : value && value.seconds
        ? new Date(value.seconds * 1000)
        : value
          ? new Date(value)
          : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("en-GB")
    : "—";
};

function AdminPanel({ onClose }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState("requests");
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmedTotal, setConfirmedTotal] = useState("");
  const [statusSelection, setStatusSelection] = useState("");
  const [productDraft, setProductDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [requestFilter, setRequestFilter] = useState("all");
  const [reportDates, setReportDates] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  });
  const [report, setReport] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!backendEnabled) return;
    setBusy(true);
    setError("");
    try {
      const data = await loadAdminData();
      setDashboard(data.dashboard);
      setRequests(data.requests);
      setProducts(data.products);
      setCategories(data.categories);
      setSettings(data.settings);
      setBankDetails(data.privateSettings.bankDetails);
      setSelectedRequest((current) =>
        current
          ? data.requests.find((request) => request.id === current.id) || null
          : null,
      );
    } catch (requestError) {
      console.error("Could not load administrator data.", requestError);
      setError(
        requestError.message || "Administrator data could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!backendEnabled) {
      setAuthReady(true);
      return undefined;
    }
    let active = true;
    getAdminSession()
      .then((session) => {
        if (active) setUser(session);
      })
      .catch((authError) => {
        if (active) {
          console.error("Administrator session could not be checked.", authError);
          setError("Sign-in could not be checked. Please reload and try again.");
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const runAdminAction = async (action, successMessage) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await refresh();
      return true;
    } catch (actionError) {
      console.error("Administrator action failed.", actionError);
      setError(
        actionError.message ||
          "The administrator action could not be completed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await loginAdmin(login.email, login.password);
      setUser(session);
      setLogin((current) => ({ ...current, password: "" }));
    } catch (loginError) {
      console.error("Administrator sign-in failed.", loginError);
      setError(
        loginError.message || "Sign-in failed. Check your email and password.",
      );
    } finally {
      setBusy(false);
    }
  };

  const openRequest = async (requestId) => {
    setBusy(true);
    setError("");
    try {
      const request = await getOrderRequest(requestId);
      setSelectedRequest(request);
      const initialTotalMinor = Number.isInteger(request.confirmedTotalMinor)
        ? request.confirmedTotalMinor
        : request.estimatedTotalMinor;
      setConfirmedTotal(
        Number.isInteger(initialTotalMinor)
          ? (initialTotalMinor / 100).toFixed(2)
          : "",
      );
      setStatusSelection("");
    } catch (requestError) {
      console.error("Order request could not be loaded.", requestError);
      setError(requestError.message || "Order request could not be loaded.");
    } finally {
      setBusy(false);
    }
  };

  const saveProductDraft = (event) => {
    event.preventDefault();
    const productId = productDraft.id || slugify(productDraft.name);
    runAdminAction(
      async () => {
        const { imageFile, ...product } = productDraft;
        if (imageFile) product.image = await uploadImage(imageFile);
        await saveProduct({
          ...product,
          id: productId,
          priceMinor: Math.round(Number(product.price) * 100),
          stockQuantity: Number(product.stockQuantity),
        });
      },
      "Product saved.",
    ).then((saved) => {
      if (saved) setProductDraft(null);
    });
  };

  const saveCategoryDraft = (event) => {
    event.preventDefault();
    const categoryId = categoryDraft.id || slugify(categoryDraft.name);
    runAdminAction(
      async () => {
        const { imageFile, ...category } = categoryDraft;
        if (imageFile) category.image = await uploadImage(imageFile);
        await saveCategory({
          ...category,
          id: categoryId,
          displayOrder: Number(category.displayOrder),
        });
      },
      "Category saved.",
    ).then((saved) => {
      if (saved) setCategoryDraft(null);
    });
  };

  const updateSettings = (section, value) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], ...value },
    }));
  };

  const updateBankDetails = (value) => {
    setBankDetails((current) => ({ ...current, ...value }));
  };

  const updateRequestStatusAndEmail = async (status) => {
    if (!selectedRequest || !bankDetails) return;
    const confirmedTotalMinor =
      status === "accepted"
        ? Math.round(Number(confirmedTotal) * 100)
        : selectedRequest.confirmedTotalMinor;
    if (
      status === "accepted" &&
      (!Number.isFinite(confirmedTotalMinor) || confirmedTotalMinor < 1)
    ) {
      setError("Enter the confirmed order total before selecting Accepted.");
      return;
    }
    if (status === "payment_received" && !selectedRequest.confirmedTotalMinor) {
      setError(
        "Accept the request and record its confirmed total before marking payment received.",
      );
      return;
    }
    if (!statusEmailConfigured) {
      setError(
        "Set the EmailJS service ID, order confirmation template ID, and public key in .env.local, then restart the app.",
      );
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    let statusSaved = false;
    let emailSent = false;
    const updatedRequest = {
      ...selectedRequest,
      status,
      ...(status === "accepted" ? { confirmedTotalMinor } : {}),
    };
    try {
      await updateOrderRequest(selectedRequest.id, status, confirmedTotalMinor);
      statusSaved = true;
      setSelectedRequest(updatedRequest);
      setRequests((current) =>
        current.map((request) =>
          request.id === updatedRequest.id ? updatedRequest : request,
        ),
      );

      const requestedItems = selectedRequest.items
        .map((item) => {
          const personalisation =
            item.customDetails && item.customDetails.personalisation;
          const notes = personalisation
            ? [
                personalisation.recipient
                  ? `Recipient: ${personalisation.recipient}`
                  : "",
                personalisation.occasion
                  ? `Occasion: ${personalisation.occasion}`
                  : "",
                personalisation.giftMessage
                  ? `Gift message: ${personalisation.giftMessage}`
                  : "",
                personalisation.specialInstructions
                  ? `Special instructions: ${personalisation.specialInstructions}`
                  : "",
              ].filter(Boolean)
            : [];
          return [requestItemText(item), ...notes].join("\n");
        })
        .join("\n\n");
      const deliveryAddress = [
        selectedRequest.deliveryAddress.line1,
        selectedRequest.deliveryAddress.line2,
        `${selectedRequest.deliveryAddress.city}, ${selectedRequest.deliveryAddress.postcode}`,
        selectedRequest.deliveryAddress.preferredDate
          ? `Preferred delivery date: ${selectedRequest.deliveryAddress.preferredDate}`
          : "",
        selectedRequest.deliveryAddress.instructions
          ? `Delivery instructions: ${selectedRequest.deliveryAddress.instructions}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sendOrderStatusEmail({
        request: selectedRequest,
        status,
        items: requestedItems,
        confirmedTotalMinor,
        deliveryAddress,
        bankDetails,
      });
      emailSent = true;
      const emailedRequest = {
        ...updatedRequest,
        lastStatusEmail: status,
        lastStatusEmailSentAt: new Date(),
      };
      setSelectedRequest(emailedRequest);
      setRequests((current) =>
        current.map((request) =>
          request.id === emailedRequest.id ? emailedRequest : request,
        ),
      );
      await markStatusEmailSent(selectedRequest.id, status);
      setNotice(
        `${requestStatusLabel(status)} update emailed to the customer.`,
      );
    } catch (actionError) {
      console.error(
        "Could not update the request and email the customer.",
        actionError,
      );
      if (emailSent) {
        setError(
          `The email was sent, but its sent status could not be recorded: ${actionError.message}`,
        );
      } else if (statusSaved) {
        setError(
          `The status was saved, but the email was not sent. Select the status again to retry: ${actionError.message}`,
        );
      } else {
        setError(
          actionError.message || "The status update could not be saved.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const visibleRequests = useMemo(
    () =>
      requestFilter === "all"
        ? requests
        : requests.filter(
            (request) =>
              normalizeRequestStatus(request.status) === requestFilter,
          ),
    [requestFilter, requests],
  );

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const requestItemText = (item) => {
    if (!item.customDetails) {
      return `${item.quantity} × ${productById.get(item.productId)?.name || item.productId}`;
    }
    const contents = item.customDetails.contents
      .map(
        (content) =>
          `${content.quantity} × ${productById.get(content.productId)?.name || content.productId}`,
      )
      .join(", ");
    return `${item.quantity} × Custom ${item.customDetails.boxId} hamper (${contents})`;
  };

  const filteredReport = useMemo(() => {
    if (!report) return null;
    return report.filter((request) => {
      const createdAt =
        request.createdAt && typeof request.createdAt.toDate === "function"
          ? request.createdAt.toDate()
          : new Date(request.createdAt || 0);
      const date = Number.isNaN(createdAt.getTime())
        ? ""
        : createdAt.toISOString().slice(0, 10);
      return date >= reportDates.startDate && date <= reportDates.endDate;
    });
  }, [report, reportDates]);

  const loadReport = (event) => {
    event.preventDefault();
    setReport(requests);
  };

  const downloadReport = () => {
    if (!filteredReport || !filteredReport.length) return;
    const columns = [
      "Request reference",
      "Submitted",
      "Customer",
      "Email",
      "Status",
      "Requested items",
      "payment received",
      "Confirmed total",
      "Delivery address",
      "Bank account name",
      "Bank name",
      "Sort code",
      "Account number",
      "Payment instructions",
    ];
    const rows = filteredReport.map((request) => [
      request.reference,
      request.createdAt
        ? new Date(request.createdAt).toISOString()
        : "",
      request.customer.name,
      request.customer.email,
      requestStatusLabel(request.status),
      request.items.map(requestItemText).join("; "),
    ]);
    const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [columns, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gift-requests-${reportDates.startDate}-${reportDates.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authReady) {
    return (
      <div className="admin-screen">
        <section className="admin-login">
          <p>Checking administrator sign-in…</p>
        </section>
      </div>
    );
  }

  if (!backendEnabled) {
    return (
      <div className="admin-screen">
        <section className="admin-login">
          <button className="admin-close" type="button" onClick={onClose}>
            ×
          </button>
          <span className="eyebrow">SHOP MANAGEMENT</span>
          <h1>Shop API needs setting up.</h1>
          <p>Set REACT_APP_API_URL to the deployed Render API before signing in.</p>
          <button className="admin-primary" type="button" onClick={onClose}>
            Back to the shop
          </button>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-screen">
        <section className="admin-login">
          <button className="admin-close" type="button" onClick={onClose}>
            ×
          </button>
          <span className="eyebrow">SHOP MANAGEMENT</span>
          <h1>Admin sign-in</h1>
          <p>Sign in with an authorised shop account.</p>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submitLogin}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={login.email}
                onChange={(event) =>
                  setLogin({ ...login, email: event.target.value })
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={login.password}
                onChange={(event) =>
                  setLogin({ ...login, password: event.target.value })
                }
              />
            </label>
            <button className="admin-primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const panelTabs = [
    ["requests", "Order requests"],
    ["products", "Products & stock"],
    ["categories", "Categories"],
    ["reports", "Request reports"],
    ["settings", "Shop settings"],
  ];

  return (
    <div className="admin-screen">
      <div className="admin-topbar">
        <div>
          <span className="admin-mark">✿</span>
          <span>
            The Gift Collection <small>SHOP ADMIN</small>
          </span>
        </div>
        <div>
          <span className="admin-user">{user.email}</span>
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              setUser(null);
              setSelectedRequest(null);
            }}
          >
            Sign out
          </button>
          <button
            type="button"
            className="admin-close"
            onClick={onClose}
            aria-label="Close admin"
          >
            ×
          </button>
        </div>
      </div>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <span className="eyebrow">MANAGE YOUR SHOP</span>
          {panelTabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={tab === key ? "selected" : ""}
              onClick={() => {
                setTab(key);
                setSelectedRequest(null);
                setProductDraft(null);
                setCategoryDraft(null);
              }}
            >
              {label}
            </button>
          ))}
        </aside>
        <main className="admin-content">
          <header className="admin-content-heading">
            <div>
              <span className="eyebrow">
                LITTLE THINGS / {tab.toUpperCase()}
              </span>
              <h1>
                {tab === "requests"
                  ? "Manual order requests"
                  : tab === "products"
                    ? "Products & stock"
                    : tab === "categories"
                      ? "Categories"
                      : tab === "reports"
                        ? "Request reports"
                        : "Shop settings"}
              </h1>
            </div>
            <button
              type="button"
              className="admin-secondary"
              onClick={refresh}
              disabled={busy}
            >
              {busy ? "Working…" : "Refresh"}
            </button>
          </header>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}
          <p className="admin-private-note">
            Manual request mode: requests are not confirmed orders. Check stock
            and final prices yourself, contact customers manually, and do not
            treat an estimate as payment due.
          </p>
          {dashboard && (
            <div className="admin-stat-grid">
              <div>
                <small>Requests loaded</small>
                <strong>{dashboard.totalRequests}</strong>
              </div>
              <div>
                <small>Received requests</small>
                <strong>{dashboard.newRequests}</strong>
              </div>
              <div>
                <small>Active products</small>
                <strong>{dashboard.activeProducts}</strong>
              </div>
              <div>
                <small>Low stock ≤ 5</small>
                <strong>{dashboard.lowStockProducts}</strong>
              </div>
            </div>
          )}

          {tab === "requests" && (
            <section className="admin-card">
              <div className="admin-filter-row">
                <label>
                  Request status
                  <select
                    value={requestFilter}
                    onChange={(event) => setRequestFilter(event.target.value)}
                  >
                    <option value="all">All requests</option>
                    {REQUEST_STATUSES.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedRequest ? (
                <div className="admin-order-detail">
                  <button
                    type="button"
                    className="admin-back"
                    onClick={() => setSelectedRequest(null)}
                  >
                    ← All requests
                  </button>
                  <h2>Request {selectedRequest.reference}</h2>
                  <p>
                    {selectedRequest.customer.name} ·{" "}
                    <a href={`mailto:${selectedRequest.customer.email}`}>
                      {selectedRequest.customer.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${selectedRequest.customer.telephone}`}>
                      {selectedRequest.customer.telephone}
                    </a>
                  </p>
                  <p>
                    {selectedRequest.deliveryAddress.line1}
                    {selectedRequest.deliveryAddress.line2
                      ? `, ${selectedRequest.deliveryAddress.line2}`
                      : ""}
                    , {selectedRequest.deliveryAddress.city},{" "}
                    {selectedRequest.deliveryAddress.postcode}
                  </p>
                  {selectedRequest.deliveryAddress.preferredDate && (
                    <p>
                      Preferred delivery date:{" "}
                      {selectedRequest.deliveryAddress.preferredDate}
                    </p>
                  )}
                  {selectedRequest.deliveryAddress.instructions && (
                    <p>
                      Delivery note:{" "}
                      {selectedRequest.deliveryAddress.instructions}
                    </p>
                  )}
                  <h3>Requested items (not reserved)</h3>
                  {Number.isInteger(selectedRequest.estimatedTotalMinor) && (
                    <p className="admin-private-note">
                      Checkout estimate:{" "}
                      {money(selectedRequest.estimatedTotalMinor)}. This is
                      not a confirmed quote; verify availability and the final
                      price before accepting.
                    </p>
                  )}
                  <div className="admin-order-items">
                    {selectedRequest.items.map((item, index) => (
                      <div
                        key={`${item.productId || item.customDetails.boxId}-${index}`}
                      >
                        <strong>{requestItemText(item)}</strong>
                        {item.customDetails &&
                          item.customDetails.personalisation && (
                            <small>
                              {item.customDetails.personalisation.recipient
                                ? `For: ${item.customDetails.personalisation.recipient} · `
                                : ""}
                              {item.customDetails.personalisation.occasion ||
                                ""}
                              {item.customDetails.personalisation.giftMessage
                                ? ` · Card: ${item.customDetails.personalisation.giftMessage}`
                                : ""}
                              {item.customDetails.personalisation
                                .specialInstructions
                                ? ` · Instructions: ${item.customDetails.personalisation.specialInstructions}`
                                : ""}
                            </small>
                          )}
                      </div>
                    ))}
                  </div>
                  <p className="admin-private-note">
                    The confirmed total field is pre-filled with the checkout
                    estimate when available. Verify or adjust it before
                    selecting Accepted. Verify the bank transfer before
                    selecting Payment received. BACS details are included only
                    in the Accepted email.
                  </p>
                  <p>
                    Current status:{" "}
                    <strong>
                      {requestStatusLabel(selectedRequest.status)}
                    </strong>
                  </p>
                  <label>
                    Confirmed total (£)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={confirmedTotal}
                      onChange={(event) =>
                        setConfirmedTotal(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Send status update
                    <select
                      value={statusSelection}
                      disabled={busy || !statusEmailConfigured}
                      onChange={(event) => {
                        const status = event.target.value;
                        setStatusSelection("");
                        if (status) updateRequestStatusAndEmail(status);
                      }}
                    >
                      <option value="">Choose a status…</option>
                      {REQUEST_STATUSES.map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!statusEmailConfigured && (
                    <p className="admin-private-note">
                      Email is not configured. Add the EmailJS service ID, order
                      confirmation template ID, and public key to .env.local,
                      then restart the app.
                    </p>
                  )}
                  {selectedRequest.lastStatusEmailSentAt && (
                    <p className="admin-notice">
                      Last emailed status:{" "}
                      {requestStatusLabel(selectedRequest.lastStatusEmail)} ·{" "}
                      {dateText(selectedRequest.lastStatusEmailSentAt)}
                    </p>
                  )}
                  <p>Submitted: {dateText(selectedRequest.createdAt)}</p>
                </div>
              ) : (
                <>
                  <div className="admin-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Customer</th>
                          <th>Submitted</th>
                          <th>Requested items</th>
                          <th>Estimate</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRequests.map((request) => (
                          <tr
                            key={request.id}
                            onClick={() => openRequest(request.id)}
                          >
                            <td>
                              <button
                                className="admin-link-button"
                                type="button"
                              >
                                {request.reference}
                              </button>
                            </td>
                            <td>
                              {request.customer.name}
                              <small>{request.customer.email}</small>
                            </td>
                            <td>{dateText(request.createdAt)}</td>
                            <td>
                              {request.items.map(requestItemText).join("; ")}
                            </td>
                            <td>
                              {Number.isInteger(request.estimatedTotalMinor)
                                ? money(request.estimatedTotalMinor)
                                : "—"}
                            </td>
                            <td>{requestStatusLabel(request.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {visibleRequests.length === 0 && (
                      <p className="admin-empty">
                        No requests match that status.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "products" && (
            <section className="admin-card">
              <div className="admin-section-heading">
                <h2>Product catalogue and stock</h2>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={() => setProductDraft({ ...EMPTY_PRODUCT })}
                >
                  Add product
                </button>
              </div>
              {productDraft && (
                <form className="admin-edit-form" onSubmit={saveProductDraft}>
                  <h3>{productDraft.id ? "Edit product" : "Add product"}</h3>
                  <div className="admin-form-grid">
                    <label>
                      Product name
                      <input
                        required
                        value={productDraft.name}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      SKU
                      <input
                        value={productDraft.sku}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            sku: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={productDraft.description}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Price (£)
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={productDraft.price}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            price: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Stock quantity
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={productDraft.stockQuantity}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            stockQuantity: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={productDraft.productType}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            productType: event.target.value,
                          })
                        }
                      >
                        <option value="ready_made">Ready-made hamper</option>
                        <option value="component">Build-a-box product</option>
                      </select>
                    </label>
                    <label>
                      Availability
                      <select
                        value={productDraft.status}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            status: event.target.value,
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="out_of_stock">Out of stock</option>
                        <option value="draft">Draft</option>
                      </select>
                    </label>
                    <label>
                      Image URL or stored image ID
                      <input
                        value={productDraft.image}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            image: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Upload product image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            imageFile: event.target.files?.[0] || null,
                          })
                        }
                      />
                    </label>
                    <label>
                      Short note
                      <input
                        value={productDraft.note}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            note: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <p className="admin-private-note">
                    Uploaded JPEG, PNG, and WebP files (up to 5 MB) are stored
                    in the shop database. An uploaded file replaces the image URL
                    when you save.
                  </p>
                  <fieldset>
                    <legend>Categories</legend>
                    {categories.map((category) => (
                      <label className="admin-check" key={category.id}>
                        <input
                          type="checkbox"
                          checked={productDraft.categoryIds.includes(
                            category.id,
                          )}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              categoryIds: event.target.checked
                                ? [...productDraft.categoryIds, category.id]
                                : productDraft.categoryIds.filter(
                                    (id) => id !== category.id,
                                  ),
                            })
                          }
                        />
                        {category.name}
                      </label>
                    ))}
                  </fieldset>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={productDraft.featured}
                      onChange={(event) =>
                        setProductDraft({
                          ...productDraft,
                          featured: event.target.checked,
                        })
                      }
                    />
                    Featured product
                  </label>
                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => setProductDraft(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-primary"
                      disabled={busy}
                    >
                      {busy ? "Saving…" : "Save product"}
                    </button>
                  </div>
                </form>
              )}
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          {product.name}
                          <small>{product.productType.replace("_", " ")}</small>
                        </td>
                        <td>{product.sku}</td>
                        <td>{money(product.priceMinor)}</td>
                        <td
                          className={
                            product.stockQuantity <= 5 ? "low-stock" : ""
                          }
                        >
                          {product.stockQuantity}
                        </td>
                        <td>{product.status.replace("_", " ")}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-link-button"
                            onClick={() =>
                              setProductDraft({
                                ...product,
                                categoryIds: product.categoryIds || [],
                                featured: product.featured === true,
                                price: (product.priceMinor / 100).toFixed(2),
                                stockQuantity: String(product.stockQuantity),
                              })
                            }
                          >
                            Edit
                          </button>
                          {product.status !== "draft" && (
                            <button
                              type="button"
                              className="admin-link-button danger"
                              onClick={() =>
                                runAdminAction(
                                  () => archiveProduct(product.id),
                                  "Product archived.",
                                )
                              }
                            >
                              Archive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "categories" && (
            <section className="admin-card">
              <div className="admin-section-heading">
                <h2>Shop categories</h2>
                <button
                  type="button"
                  className="admin-primary"
                  onClick={() =>
                    setCategoryDraft({
                      id: "",
                      name: "",
                      description: "",
                      image: "",
                      displayOrder: categories.length + 1,
                      status: "active",
                    })
                  }
                >
                  Add category
                </button>
              </div>
              {categoryDraft && (
                <form className="admin-edit-form" onSubmit={saveCategoryDraft}>
                  <h3>{categoryDraft.id ? "Edit category" : "Add category"}</h3>
                  <div className="admin-form-grid">
                    <label>
                      Name
                      <input
                        required
                        value={categoryDraft.name}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <input
                        value={categoryDraft.description}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Image URL or stored image ID
                      <input
                        value={categoryDraft.image}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            image: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Upload category image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            imageFile: event.target.files?.[0] || null,
                          })
                        }
                      />
                    </label>
                    <label>
                      Display order
                      <input
                        type="number"
                        min="0"
                        value={categoryDraft.displayOrder}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            displayOrder: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={categoryDraft.status}
                        onChange={(event) =>
                          setCategoryDraft({
                            ...categoryDraft,
                            status: event.target.value,
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                  <div className="admin-form-actions">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => setCategoryDraft(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-primary"
                      disabled={busy}
                    >
                      Save category
                    </button>
                  </div>
                </form>
              )}
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{category.description}</td>
                        <td>{category.displayOrder}</td>
                        <td>{category.status}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-link-button"
                            onClick={() => setCategoryDraft({ ...category })}
                          >
                            Edit
                          </button>
                          {category.status === "active" && (
                            <button
                              type="button"
                              className="admin-link-button danger"
                              onClick={() =>
                                runAdminAction(
                                  () => archiveCategory(category.id),
                                  "Category archived.",
                                )
                              }
                            >
                              Archive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "settings" && settings && bankDetails && (
            <section className="admin-card">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runAdminAction(
                    () => saveShopSettings(settings),
                    "Shop settings saved.",
                  );
                }}
                className="admin-settings-form"
              >
                <h2>Business & delivery</h2>
                <div className="admin-form-grid">
                  <label>
                    Business name
                    <input
                      required
                      value={settings.business.name}
                      onChange={(event) =>
                        updateSettings("business", { name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Contact email
                    <input
                      required
                      type="email"
                      value={settings.business.contactEmail}
                      onChange={(event) =>
                        updateSettings("business", {
                          contactEmail: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Telephone
                    <input
                      required
                      value={settings.business.telephone}
                      onChange={(event) =>
                        updateSettings("business", {
                          telephone: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Standard delivery (£)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={(
                        settings.delivery.standardDeliveryMinor / 100
                      ).toFixed(2)}
                      onChange={(event) =>
                        updateSettings("delivery", {
                          standardDeliveryMinor: Math.round(
                            Number(event.target.value) * 100,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Free delivery from (£)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={(
                        settings.delivery.freeThresholdMinor / 100
                      ).toFixed(2)}
                      onChange={(event) =>
                        updateSettings("delivery", {
                          freeThresholdMinor: Math.round(
                            Number(event.target.value) * 100,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Estimated delivery days
                    <input
                      required
                      type="number"
                      min="1"
                      max="90"
                      value={settings.delivery.estimatedDeliveryDays}
                      onChange={(event) =>
                        updateSettings("delivery", {
                          estimatedDeliveryDays: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Delivery postcode prefixes
                    <input
                      value={(settings.delivery.areas || []).join(", ")}
                      onChange={(event) =>
                        updateSettings("delivery", {
                          areas: event.target.value
                            .split(",")
                            .map((area) => area.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label>
                    Delivery information
                    <input
                      value={settings.delivery.instructions || ""}
                      onChange={(event) =>
                        updateSettings("delivery", {
                          instructions: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <h2>Storefront announcement</h2>
                <div className="admin-form-grid">
                  <label className="wide-field">
                    Announcement message
                    <textarea
                      maxLength="180"
                      value={settings.announcement.text}
                      onChange={(event) =>
                        updateSettings("announcement", {
                          text: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={settings.announcement.enabled}
                      onChange={(event) =>
                        updateSettings("announcement", {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    Show announcement on storefront
                  </label>
                </div>
                <h2>Build-a-box estimates</h2>
                <div className="admin-box-settings">
                  {Object.entries(settings.boxes).map(([id, box]) => (
                    <div key={id}>
                      <strong>{box.name}</strong>
                      <label>
                        Price (£)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={(box.priceMinor / 100).toFixed(2)}
                          onChange={(event) =>
                            updateSettings("boxes", {
                              [id]: {
                                ...box,
                                priceMinor: Math.round(
                                  Number(event.target.value) * 100,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <label>
                        Maximum items
                        <input
                          type="number"
                          min="1"
                          value={box.maxItems}
                          onChange={(event) =>
                            updateSettings("boxes", {
                              [id]: {
                                ...box,
                                maxItems: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <p className="admin-private-note">
                  Displayed prices are estimates only. Confirm all prices and
                  stock manually before accepting a request.
                </p>
                <div className="admin-form-actions">
                  <button className="admin-primary" disabled={busy}>
                    Save shop settings
                  </button>
                </div>
              </form>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runAdminAction(
                    () => saveBankDetails(bankDetails),
                    "BACS details saved to admin-only settings.",
                  );
                }}
                className="admin-settings-form"
              >
                <h2>BACS bank details</h2>
                <p className="admin-private-note">
                  These details are stored in administrator-only database settings.
                  They are not shown to customers or included in request
                  confirmations.
                </p>
                <div className="admin-form-grid">
                  <label>
                    Account name
                    <input
                      autoComplete="off"
                      maxLength="120"
                      value={bankDetails.accountName}
                      onChange={(event) =>
                        updateBankDetails({ accountName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Bank name
                    <input
                      autoComplete="off"
                      maxLength="120"
                      value={bankDetails.bankName}
                      onChange={(event) =>
                        updateBankDetails({ bankName: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Sort code
                    <input
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength="20"
                      value={bankDetails.sortCode}
                      onChange={(event) =>
                        updateBankDetails({ sortCode: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Account number
                    <input
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength="34"
                      value={bankDetails.accountNumber}
                      onChange={(event) =>
                        updateBankDetails({ accountNumber: event.target.value })
                      }
                    />
                  </label>
                  <label className="wide-field">
                    Payment instructions
                    <textarea
                      maxLength="500"
                      value={bankDetails.paymentInstructions}
                      onChange={(event) =>
                        updateBankDetails({
                          paymentInstructions: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="admin-form-actions">
                  <button className="admin-primary" disabled={busy}>
                    {busy ? "Saving…" : "Save BACS details"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {tab === "reports" && (
            <section className="admin-card">
              <form className="admin-report-form" onSubmit={loadReport}>
                <label>
                  From
                  <input
                    type="date"
                    required
                    value={reportDates.startDate}
                    onChange={(event) =>
                      setReportDates({
                        ...reportDates,
                        startDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    required
                    value={reportDates.endDate}
                    onChange={(event) =>
                      setReportDates({
                        ...reportDates,
                        endDate: event.target.value,
                      })
                    }
                  />
                </label>
                <button className="admin-primary" disabled={busy}>
                  Run report
                </button>
              </form>
              {filteredReport && (
                <>
                  <div className="admin-report-summary">
                    <div>
                      <small>Requests in range</small>
                      <strong>{filteredReport.length}</strong>
                    </div>
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={downloadReport}
                      disabled={!filteredReport.length}
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="admin-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Requested items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReport.map((request) => (
                          <tr key={request.id}>
                            <td>{request.reference}</td>
                            <td>{dateText(request.createdAt)}</td>
                            <td>{request.customer.name}</td>
                            <td>{requestStatusLabel(request.status)}</td>
                            <td>
                              {request.items.map(requestItemText).join("; ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
