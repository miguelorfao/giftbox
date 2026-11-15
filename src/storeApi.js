const configuredApiUrl = import.meta.env.VITE_API_URL || "/api";
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");
export const backendEnabled = Boolean(API_BASE_URL);

const adminTokenKey = "giftbox-admin-token";
const emailJsSettings = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId:
    import.meta.env.VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE_ID ||
    import.meta.env.VITE_EMAILJS_ACCEPTANCE_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

export const statusEmailConfigured =
  Object.values(emailJsSettings).every(Boolean);

const requestStatuses = [
  "received",
  "accepted",
  "payment_received",
  "cancellation",
  "completed",
  "out_for_delivery",
];
const statusMessages = {
  received:
    "We have received your request. It is not confirmed; please wait for us to check availability and confirm the final price before paying.",
  accepted:
    "Your order has been accepted. Please pay the confirmed total using the BACS details below and include your order reference.",
  payment_received:
    "We have received your payment. Your order will now continue through preparation.",
  cancellation:
    "Your request has been cancelled. Please contact us if you need any help.",
  completed: "Your order is complete. Thank you for choosing us.",
  out_for_delivery: "Your order is out for delivery.",
};

function getAdminToken() {
  return typeof window === "undefined"
    ? ""
    : window.sessionStorage.getItem(adminTokenKey) || "";
}

function clearAdminToken() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(adminTokenKey);
  }
}

async function apiRequest(path, { auth = true, body, headers = {}, ...options } = {}) {
  if (!backendEnabled) {
    throw new Error("Set VITE_API_URL to connect to the gift shop API.");
  }

  const requestHeaders = { Accept: "application/json", ...headers };
  let requestBody = body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  if (auth && getAdminToken()) {
    requestHeaders.Authorization = `Bearer ${getAdminToken()}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: requestHeaders,
      ...(requestBody ? { body: requestBody } : {}),
    });
  } catch (cause) {
    const error = new Error(
      "Cannot reach the shop API. Start the API server and check its MySQL settings.",
    );
    error.cause = cause;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearAdminToken();
    const error = new Error(data.error || `The API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function catalogImageUrl(image, width = 900) {
  if (image && image.startsWith("mysql:")) {
    return `${API_BASE_URL}/images/${encodeURIComponent(image.slice(6))}`;
  }
  if (image && /^https?:\/\//i.test(image)) return image;
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=85`;
}

export async function loadPublicCatalog() {
  return apiRequest("/catalog", { auth: false });
}

export async function createOrderRequest(input) {
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 30
  ) {
    throw new Error("Your request must contain between 1 and 30 items.");
  }
  return apiRequest(
    "/orders",
    {
      auth: false,
      method: "POST",
      body: {
        customer: input.customer,
        deliveryAddress: input.deliveryAddress,
        items: input.items,
      },
    },
  );
}

export async function loginAdmin(email, password) {
  const result = await apiRequest("/admin/login", {
    auth: false,
    method: "POST",
    body: { email, password },
  });
  window.sessionStorage.setItem(adminTokenKey, result.token);
  return result.user;
}

export async function getAdminSession() {
  if (!getAdminToken()) return null;
  try {
    return await apiRequest("/admin/me");
  } catch (error) {
    if (error.status === 401) {
      clearAdminToken();
      return null;
    }
    throw error;
  }
}

export function logoutAdmin() {
  clearAdminToken();
}

export async function loadAdminData() {
  return apiRequest("/admin/data");
}

export async function getOrderRequest(requestId) {
  return apiRequest(`/admin/orders/${encodeURIComponent(requestId)}`);
}

export async function updateOrderRequest(
  requestId,
  status,
  confirmedTotalMinor,
) {
  if (!requestStatuses.includes(status)) {
    throw new Error("The request status is invalid.");
  }
  return apiRequest(
    `/admin/orders/${encodeURIComponent(requestId)}/status`,
    {
      method: "PATCH",
      body: { status, confirmedTotalMinor },
    },
  );
}

export async function markStatusEmailSent(requestId, status) {
  if (!requestStatuses.includes(status)) {
    throw new Error("The request status is invalid.");
  }
  return apiRequest(
    `/admin/orders/${encodeURIComponent(requestId)}/status-email`,
    { method: "POST", body: { status } },
  );
}

export async function sendOrderStatusEmail({
  request,
  status,
  items,
  confirmedTotalMinor,
  deliveryAddress,
  bankDetails,
}) {
  if (!requestStatuses.includes(status)) {
    throw new Error("The request status is invalid.");
  }
  if (!statusEmailConfigured) {
    throw new Error(
      "Configure the EmailJS service ID, order confirmation template ID, and public key before sending customer emails.",
    );
  }
  if (
    status === "accepted" &&
    (!Number.isInteger(confirmedTotalMinor) || confirmedTotalMinor < 1)
  ) {
    throw new Error(
      "Enter the confirmed order total before accepting the request.",
    );
  }
  if (
    status === "accepted" &&
    (!bankDetails.accountName ||
      !bankDetails.bankName ||
      !bankDetails.sortCode ||
      !bankDetails.accountNumber)
  ) {
    throw new Error(
      "Complete and save all BACS account details before accepting the request.",
    );
  }
  const paymentDetails =
    status === "accepted"
      ? [
          "BACS payment details",
          `Account name: ${bankDetails.accountName}`,
          `Bank: ${bankDetails.bankName}`,
          `Sort code: ${bankDetails.sortCode}`,
          `Account number: ${bankDetails.accountNumber}`,
          bankDetails.paymentInstructions ||
            `Please use ${request.reference} as your payment reference.`,
        ].join("\n")
      : "";

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: emailJsSettings.serviceId,
      template_id: emailJsSettings.templateId,
      user_id: emailJsSettings.publicKey,
      template_params: {
        customer_email: request.customer.email,
        customer_name: request.customer.name,
        order_reference: request.reference,
        status_label: {
          received: "Received",
          accepted: "Accepted",
          payment_received: "Payment received",
          cancellation: "Cancellation",
          completed: "Completed",
          out_for_delivery: "Out for delivery",
        }[status],
        status_message: statusMessages[status],
        confirmed_total:
          ["accepted", "payment_received"].includes(status) &&
          Number.isInteger(confirmedTotalMinor)
            ? new Intl.NumberFormat("en-GB", {
                style: "currency",
                currency: "GBP",
              }).format(confirmedTotalMinor / 100)
            : "",
        requested_items: items,
        delivery_address: deliveryAddress,
        account_name: status === "accepted" ? bankDetails.accountName : "",
        bank_name: status === "accepted" ? bankDetails.bankName : "",
        sort_code: status === "accepted" ? bankDetails.sortCode : "",
        account_number: status === "accepted" ? bankDetails.accountNumber : "",
        payment_details: paymentDetails,
        payment_instructions:
          status === "accepted"
            ? bankDetails.paymentInstructions ||
              `Please use ${request.reference} as your payment reference.`
            : "",
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `EmailJS could not send the confirmation (${response.status}): ${responseText.slice(0, 300)}`,
    );
  }
}

export async function saveProduct(product) {
  const { id, price, ...fields } = product;
  delete fields.priceMinor;
  await apiRequest(`/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: {
      ...fields,
      priceMinor: Math.round(Number(price) * 100),
      stockQuantity: Number(product.stockQuantity),
    },
  });
}

export async function uploadImage(file) {
  const body = new FormData();
  body.append("image", file);
  const result = await apiRequest("/admin/images", {
    method: "POST",
    body,
  });
  return result.image;
}

export async function archiveProduct(productId) {
  return apiRequest(
    `/admin/products/${encodeURIComponent(productId)}/archive`,
    { method: "PATCH" },
  );
}

export async function saveCategory(category) {
  const { id, ...fields } = category;
  return apiRequest(`/admin/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { ...fields, displayOrder: Number(category.displayOrder) },
  });
}

export async function archiveCategory(categoryId) {
  return apiRequest(
    `/admin/categories/${encodeURIComponent(categoryId)}/archive`,
    { method: "PATCH" },
  );
}

export async function saveShopSettings(settings) {
  return apiRequest("/admin/settings", {
    method: "PUT",
    body: settings,
  });
}

export async function saveBankDetails(bankDetails) {
  return apiRequest("/admin/settings/private", {
    method: "PUT",
    body: bankDetails,
  });
}
