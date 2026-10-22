import { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const starterProducts = [
  {
    id: 1,
    name: "Luxury Chocolates",
    category: "Food & Drink",
    cost: 3.5,
    stock: 40,
  },
  {
    id: 2,
    name: "Scented Candle",
    category: "Home & Fragrance",
    cost: 4,
    stock: 25,
  },
  { id: 3, name: "Gift Box", category: "Packaging", cost: 2, stock: 35 },
  {
    id: 4,
    name: "Personalised Card",
    category: "Personalisation",
    cost: 0.75,
    stock: 100,
  },
  {
    id: 5,
    name: "Luxury Biscuits",
    category: "Food & Drink",
    cost: 2.5,
    stock: 50,
  },
  {
    id: 6,
    name: "Bath Bomb Set",
    category: "Bath & Body",
    cost: 4.5,
    stock: 18,
  },
];

const starterOrders = [
  {
    id: "GH-1001",
    customer: "Sample Customer",
    hamper: "Luxury Christmas Hamper",
    quantity: 2,
    total: 72,
    status: "Paid",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    id: "GH-1002",
    customer: "Example Customer",
    hamper: "Cosy Evening Hamper",
    quantity: 1,
    total: 28,
    status: "Awaiting payment",
    date: new Date().toISOString().slice(0, 10),
  },
];

const starterExpenses = [
  { id: 1, name: "Website subscription", amount: 15, frequency: "Monthly" },
  { id: 2, name: "Packaging supplies", amount: 25, frequency: "One-off" },
];

const starterHamperItems = [
  { productId: 1, quantity: 2 },
  { productId: 2, quantity: 1 },
  { productId: 3, quantity: 1 },
  { productId: 4, quantity: 1 },
  { productId: 5, quantity: 2 },
];

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function money(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value) || 0);
}

function Metric({ label, value, note, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <h3>{value}</h3>
      <p>{note}</p>
    </div>
  );
}

function PageTitle({ title, subtitle, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

function App() {
  const [page, setPage] = useState("Dashboard");

  const [products, setProducts] = useState(() =>
    loadData("giftbiz-products", starterProducts),
  );

  const [orders, setOrders] = useState(() =>
    loadData("giftbiz-orders", starterOrders),
  );

  const [expenses, setExpenses] = useState(() =>
    loadData("giftbiz-expenses", starterExpenses),
  );

  const [hamperItems, setHamperItems] = useState(() =>
    loadData("giftbiz-hamper-items", starterHamperItems),
  );

  const [orderCustomer, setOrderCustomer] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [hamperName, setHamperName] = useState("");
  const [packagingCost, setPackagingCost] = useState(2.5);
  const [labourCost, setLabourCost] = useState(3);
  const [deliveryCost, setDeliveryCost] = useState(2);
  const [otherCost, setOtherCost] = useState(1.2);
  const [margin, setMargin] = useState(50);
  const [bulkQuantity, setBulkQuantity] = useState(30);

  const [productSearch, setProductSearch] = useState("");
  const [notice, setNotice] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    category: "Food & Drink",
    cost: "",
    stock: "",
  });

  const [orderForm, setOrderForm] = useState({
    customer: "",
    hamper: "",
    quantity: 1,
    total: "",
    status: "Awaiting payment",
  });

  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    frequency: "One-off",
  });

  useEffect(() => {
    localStorage.setItem("giftbiz-products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("giftbiz-orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("giftbiz-expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("giftbiz-hamper-items", JSON.stringify(hamperItems));
  }, [hamperItems]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const hamperProductCost = useMemo(() => {
    return hamperItems.reduce((total, item) => {
      const product = products.find(
        (product) => product.id === Number(item.productId),
      );

      return total + (product ? product.cost * item.quantity : 0);
    }, 0);
  }, [hamperItems, products]);

  const totalHamperCost =
    hamperProductCost +
    Number(packagingCost) +
    Number(labourCost) +
    Number(deliveryCost) +
    Number(otherCost);

  const safeMargin = Math.min(95, Math.max(0, Number(margin) || 0));

  const sellingPrice =
    safeMargin >= 100 ? 0 : totalHamperCost / (1 - safeMargin / 100);

  const estimatedProfit = sellingPrice - totalHamperCost;

  const revenue = orders
    .filter((order) => order.status === "Paid")
    .reduce((total, order) => total + Number(order.total), 0);

  const pendingPayments = orders
    .filter((order) => order.status === "Awaiting payment")
    .reduce((total, order) => total + Number(order.total), 0);

  const monthlyExpenses = expenses.reduce((total, expense) => {
    if (expense.frequency === "Monthly") {
      return total + Number(expense.amount);
    }

    return total;
  }, 0);

  const paidOrders = orders.filter((order) => order.status === "Paid");

  const averageOrderValue = paidOrders.length ? revenue / paidOrders.length : 0;

  const estimatedOrderCosts = paidOrders.reduce(
    (total, order) => total + Number(order.total) * 0.5,
    0,
  );

  const estimatedProfitFromOrders =
    revenue - estimatedOrderCosts - monthlyExpenses;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  function addProduct(event) {
    event.preventDefault();

    if (!productForm.name.trim()) {
      setNotice("Please enter a product name.");
      return;
    }

    const cost = Number(productForm.cost);
    const stock = Number(productForm.stock);

    if (
      productForm.cost === "" ||
      productForm.stock === "" ||
      !Number.isFinite(cost) ||
      !Number.isFinite(stock) ||
      cost < 0 ||
      stock < 0
    ) {
      setNotice("Enter a valid cost and stock quantity.");
      return;
    }

    setProducts((current) => [
      ...current,
      {
        id: Date.now(),
        name: productForm.name.trim(),
        category: productForm.category,
        cost,
        stock,
      },
    ]);

    setProductForm({
      name: "",
      category: "Food & Drink",
      cost: "",
      stock: "",
    });

    setNotice("Product added successfully.");
  }

  function addHamperItem() {
    if (!products.length) {
      setNotice("Add a product before building a hamper.");
      return;
    }

    setHamperItems((current) => [
      ...current,
      { productId: products[0].id, quantity: 1 },
    ]);
  }

  function updateHamperItem(index, field, value) {
    setHamperItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "quantity"
                  ? Math.max(1, Number(value) || 1)
                  : Number(value),
            }
          : item,
      ),
    );
  }

  function removeHamperItem(index) {
    setHamperItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function addOrder(event) {
    event.preventDefault();

    if (!orderForm.customer.trim() || !orderForm.hamper.trim()) {
      setNotice("Enter the customer and hamper name.");
      return;
    }

    const quantity = Math.max(1, Number(orderForm.quantity) || 1);
    const total = Number(orderForm.total);

    if (orderForm.total === "" || !Number.isFinite(total) || total < 0) {
      setNotice("Enter a valid order total.");
      return;
    }

    setOrders((current) => [
      {
        id: `GH-${Date.now().toString().slice(-6)}`,
        customer: orderForm.customer.trim(),
        hamper: orderForm.hamper.trim(),
        quantity,
        total,
        status: orderForm.status,
        date: new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);

    setOrderForm({
      customer: "",
      hamper: "",
      quantity: 1,
      total: "",
      status: "Awaiting payment",
    });

    setNotice("Order added successfully.");
  }
  function addHamperToOrder() {
    if (!hamperName.trim()) {
      setNotice("Please enter a hamper name.");
      return;
    }

    if (!orderCustomer.trim()) {
      setNotice("Please enter the customer's name.");
      return;
    }

    if (hamperItems.length === 0) {
      setNotice("Please add at least one item to your hamper.");
      return;
    }

    if (products.length === 0) {
      setNotice("Please add products before creating an order.");
      return;
    }

    const quantity = Math.max(1, Number(orderQuantity) || 1);
    const pricePerHamper = Number(sellingPrice.toFixed(2));
    const orderTotal = Number((pricePerHamper * quantity).toFixed(2));

    const newOrder = {
      id: `GH-${Date.now().toString().slice(-6)}`,
      customer: orderCustomer.trim(),
      hamper: hamperName.trim(),
      quantity,
      total: orderTotal,
      status: "Awaiting payment",
      date: new Date().toISOString().slice(0, 10),
    };

    setOrders((current) => [newOrder, ...current]);

    setNotice(`${hamperName} added to Orders. Total: ${money(orderTotal)}`);

    setPage("Orders");
  }

  function addExpense(event) {
    event.preventDefault();

    if (!expenseForm.name.trim() || expenseForm.amount === "") {
      setNotice("Enter an expense name and amount.");
      return;
    }

    const amount = Number(expenseForm.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      setNotice("Enter a valid expense amount.");
      return;
    }

    setExpenses((current) => [
      ...current,
      {
        id: Date.now(),
        name: expenseForm.name.trim(),
        amount,
        frequency: expenseForm.frequency,
      },
    ]);

    setExpenseForm({
      name: "",
      amount: "",
      frequency: "One-off",
    });

    setNotice("Expense added successfully.");
  }

  function updateOrderStatus(id, status) {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    );

    setNotice("Order status updated.");
  }

  function resetDemoData() {
    const confirmed = window.confirm(
      "Reset the dashboard to its original demo data? Your current browser data will be replaced.",
    );

    if (!confirmed) return;

    setProducts(starterProducts);
    setOrders(starterOrders);
    setExpenses(starterExpenses);
    setHamperItems(starterHamperItems);
    setNotice("Demo data restored.");
  }

  const navGroups = [
    {
      heading: "WORKSPACE",
      items: [
        { name: "Dashboard", icon: "▦" },
        { name: "Products", icon: "◇" },
        { name: "Hamper Builder", icon: "▣" },
        { name: "Pricing Calculator", icon: "£" },
      ],
    },
    {
      heading: "MANAGEMENT",
      items: [
        { name: "Orders", icon: "☷" },
        { name: "Expenses", icon: "↗" },
        { name: "Reports", icon: "▤" },
      ],
    },
    {
      heading: "PREFERENCES",
      items: [{ name: "Settings", icon: "⚙" }],
    },
  ];

  function renderDashboard() {
    return (
      <>
        <PageTitle
          title="Dashboard"
          subtitle="Here's an overview of your hamper business."
        >
          <button
            className="btn btn-dark"
            onClick={() => setPage("Hamper Builder")}
          >
            + Build a hamper
          </button>
        </PageTitle>

        <div className="metric-grid">
          <Metric
            label="Paid revenue"
            value={money(revenue)}
            note="Orders marked as paid"
            icon="£"
          />
          <Metric
            label="Orders"
            value={orders.length}
            note={`${paidOrders.length} paid orders`}
            icon="▣"
          />
          <Metric
            label="Awaiting payment"
            value={money(pendingPayments)}
            note="Outstanding order totals"
            icon="◷"
          />
          <Metric
            label="Monthly expenses"
            value={money(monthlyExpenses)}
            note="Recurring expenses recorded"
            icon="↘"
          />
        </div>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Recent orders</h2>
                <p>Your latest customer orders</p>
              </div>
              <button className="text-button" onClick={() => setPage("Orders")}>
                View all →
              </button>
            </div>

            {orders.length === 0 ? (
              <EmptyState>No orders yet. Add your first order.</EmptyState>
            ) : (
              <div className="table-responsive">
                <table className="table dashboard-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.customer}</td>
                        <td>{money(order.total)}</td>
                        <td>
                          <span
                            className={`status status-${order.status
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Quick actions</h2>
                <p>Manage your business</p>
              </div>
            </div>

            <div className="quick-actions">
              {[
                ["＋", "Add a product", "Products"],
                ["▣", "Build a hamper", "Hamper Builder"],
                ["£", "Calculate a price", "Pricing Calculator"],
                ["☷", "Record an order", "Orders"],
                ["↗", "Add an expense", "Expenses"],
              ].map(([icon, label, destination]) => (
                <button
                  key={label}
                  className="quick-action"
                  onClick={() => setPage(destination)}
                >
                  <span>{icon}</span>
                  {label}
                  <b>→</b>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="panel profit-panel">
          <div className="panel-heading">
            <div>
              <h2>Hamper pricing snapshot</h2>
              <p>Based on your current hamper builder</p>
            </div>
            <button
              className="btn btn-outline-dark"
              onClick={() => setPage("Pricing Calculator")}
            >
              Open calculator
            </button>
          </div>

          <div className="profit-grid">
            <div>
              <span>Estimated cost per hamper</span>
              <strong>{money(totalHamperCost)}</strong>
            </div>
            <div>
              <span>Suggested selling price</span>
              <strong>{money(sellingPrice)}</strong>
            </div>
            <div>
              <span>Estimated profit per hamper</span>
              <strong className="profit-number">
                {money(estimatedProfit)}
              </strong>
            </div>
          </div>

          <p className="small-note">
            These are estimates based on the current hamper builder, not your
            actual accounting records.
          </p>
        </section>
      </>
    );
  }

  function renderProducts() {
    return (
      <>
        <PageTitle
          title="Products"
          subtitle="Manage hamper items, purchase costs and stock."
        />

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Add a product</h2>
              <p>Record the items you use in your hampers.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={addProduct}>
            <Field label="Product name">
              <input
                className="form-control"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    name: event.target.value,
                  })
                }
                placeholder="e.g. Luxury chocolates"
                required
              />
            </Field>

            <Field label="Category">
              <select
                className="form-select"
                value={productForm.category}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    category: event.target.value,
                  })
                }
              >
                {[
                  "Food & Drink",
                  "Home & Fragrance",
                  "Packaging",
                  "Personalisation",
                  "Bath & Body",
                  "Other",
                ].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>

            <Field label="Unit cost (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={productForm.cost}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    cost: event.target.value,
                  })
                }
                placeholder="0.00"
                required
              />
            </Field>

            <Field label="Stock quantity">
              <input
                className="form-control"
                type="number"
                min="0"
                step="1"
                value={productForm.stock}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    stock: event.target.value,
                  })
                }
                placeholder="0"
                required
              />
            </Field>

            <button className="btn btn-dark form-submit" type="submit">
              + Add product
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading panel-heading-stack">
            <div>
              <h2>Your products</h2>
              <p>{products.length} products recorded</p>
            </div>
            <input
              className="form-control search-input"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search products..."
            />
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState>No products found.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Unit cost</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="product-name">{product.name}</td>
                      <td>{product.category}</td>
                      <td>{money(product.cost)}</td>
                      <td>
                        <span className={product.stock <= 5 ? "low-stock" : ""}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${product.name} from your products?`,
                              )
                            ) {
                              setProducts((current) =>
                                current.filter(
                                  (item) => item.id !== product.id,
                                ),
                              );
                              setNotice("Product deleted.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  function renderHamperBuilder() {
    return (
      <>
        <PageTitle
          title="Hamper Builder"
          subtitle="Choose your products and calculate the cost of a hamper."
        />

        <div className="content-grid builder-grid">
          <section className="panel">
            <h2>Hamper details</h2>
            <Field label="Hamper name">
              <input
                className="form-control"
                value={hamperName}
                onChange={(event) => setHamperName(event.target.value)}
                placeholder="e.g. Luxury Christmas Hamper"
              />
            </Field>

            <div className="panel-heading items-heading">
              <div>
                <h2>Hamper contents</h2>
                <p>Select products and quantities.</p>
              </div>
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={addHamperItem}
              >
                + Add item
              </button>
            </div>

            {hamperItems.length === 0 && (
              <EmptyState>
                Add an item to start building your hamper.
              </EmptyState>
            )}

            {hamperItems.map((item, index) => {
              const product = products.find(
                (product) => product.id === Number(item.productId),
              );

              return (
                <div className="hamper-item" key={`${index}-${item.productId}`}>
                  <div className="hamper-item-main">
                    <Field label="Product">
                      <select
                        className="form-select"
                        value={item.productId}
                        onChange={(event) =>
                          updateHamperItem(
                            index,
                            "productId",
                            event.target.value,
                          )
                        }
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Quantity">
                      <input
                        className="form-control"
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateHamperItem(
                            index,
                            "quantity",
                            event.target.value,
                          )
                        }
                      />
                    </Field>
                  </div>

                  <div className="hamper-item-bottom">
                    <span>{money(product ? product.cost : 0)} each</span>
                    <strong>
                      {money(product ? product.cost * item.quantity : 0)}
                    </strong>
                    <button
                      className="text-button danger-text"
                      onClick={() => removeHamperItem(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="items-total">
              <span>Products subtotal</span>
              <strong>{money(hamperProductCost)}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>Order details</h2>

            <p className="section-description">
              Prepare your hamper for a customer.
            </p>

            <Field label="Customer name">
              <input
                className="form-control"
                value={orderCustomer}
                onChange={(event) => setOrderCustomer(event.target.value)}
                placeholder="Enter customer name"
              />
            </Field>

            <Field label="Number of hampers">
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={orderQuantity}
                onChange={(event) =>
                  setOrderQuantity(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </Field>

            <hr />

            <h2>Additional costs</h2>

            <p className="section-description">
              Include the costs of making and delivering each hamper.
            </p>

            <Field label="Packaging (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={packagingCost}
                onChange={(event) => setPackagingCost(event.target.value)}
              />
            </Field>

            <Field label="Labour (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={labourCost}
                onChange={(event) => setLabourCost(event.target.value)}
              />
            </Field>

            <Field label="Delivery (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={deliveryCost}
                onChange={(event) => setDeliveryCost(event.target.value)}
              />
            </Field>

            <Field label="Other costs (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={otherCost}
                onChange={(event) => setOtherCost(event.target.value)}
              />
            </Field>

            <hr />

            <div className="price-summary">
              <div>
                <span>Cost per hamper</span>
                <strong>{money(totalHamperCost)}</strong>
              </div>

              <div>
                <span>Target profit margin</span>
                <strong>{safeMargin}%</strong>
              </div>

              <div>
                <span>Selling price per hamper</span>
                <strong className="suggested-price">
                  {money(sellingPrice)}
                </strong>
              </div>

              <div>
                <span>Profit per hamper</span>
                <strong className="profit-number">
                  {money(estimatedProfit)}
                </strong>
              </div>

              <div>
                <span>Order quantity</span>
                <strong>{orderQuantity}</strong>
              </div>

              <div className="order-total">
                <span>Total order value</span>
                <strong>{money(sellingPrice * orderQuantity)}</strong>
              </div>

              <div>
                <span>Estimated total gross profit</span>
                <strong className="profit-number">
                  {money(estimatedProfit * orderQuantity)}
                </strong>
              </div>
            </div>

            <button
              className="btn btn-dark w-100 mt-4"
              onClick={addHamperToOrder}
            >
              + Add to Order
            </button>

            <p className="small-note">
              The order will be created with an Awaiting payment status. You can
              update its payment status in the Orders section.
            </p>
          </section>
        </div>
      </>
    );
  }

  function renderPricingCalculator() {
    return (
      <>
        <PageTitle
          title="Pricing Calculator"
          subtitle="Work out the selling price needed to achieve your target profit margin."
        />

        <div className="content-grid">
          <section className="panel">
            <h2>Pricing settings</h2>
            <p className="section-description">
              These figures use the costs in your Hamper Builder.
            </p>

            <div className="calculator-cost">
              <span>Total cost per hamper</span>
              <strong>{money(totalHamperCost)}</strong>
            </div>

            <Field label={`Target profit margin: ${safeMargin}%`}>
              <input
                className="form-range"
                type="range"
                min="0"
                max="90"
                step="5"
                value={safeMargin}
                onChange={(event) => setMargin(Number(event.target.value))}
              />
            </Field>

            <div className="range-labels">
              <span>0% margin</span>
              <span>45%</span>
              <span>90% margin</span>
            </div>

            <Field label="Enter exact profit margin (%)">
              <input
                className="form-control"
                type="number"
                min="0"
                max="90"
                step="1"
                value={margin}
                onChange={(event) =>
                  setMargin(
                    Math.min(90, Math.max(0, Number(event.target.value) || 0)),
                  )
                }
              />
            </Field>

            <hr />

            <div className="price-summary">
              <div>
                <span>Cost price</span>
                <strong>{money(totalHamperCost)}</strong>
              </div>
              <div>
                <span>Suggested selling price</span>
                <strong className="suggested-price">
                  {money(sellingPrice)}
                </strong>
              </div>
              <div>
                <span>Profit per hamper</span>
                <strong className="profit-number">
                  {money(estimatedProfit)}
                </strong>
              </div>
              <div>
                <span>Profit margin</span>
                <strong>{safeMargin}%</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Bulk order calculator</h2>
            <p className="section-description">
              Estimate the totals for a batch of hampers.
            </p>

            <Field label="Number of hampers">
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={bulkQuantity}
                onChange={(event) =>
                  setBulkQuantity(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </Field>

            <div className="bulk-results">
              <div>
                <span>Number of hampers</span>
                <strong>{bulkQuantity}</strong>
              </div>
              <div>
                <span>Total production cost</span>
                <strong>{money(totalHamperCost * bulkQuantity)}</strong>
              </div>
              <div>
                <span>Potential sales revenue</span>
                <strong>{money(sellingPrice * bulkQuantity)}</strong>
              </div>
              <div>
                <span>Potential gross profit</span>
                <strong className="profit-number">
                  {money(estimatedProfit * bulkQuantity)}
                </strong>
              </div>
            </div>

            <div className="info-box">
              <strong>Remember</strong>
              <p>
                Gross profit is not the same as take-home profit. You still need
                to account for business overheads, payment fees, tax and any
                costs not included in your hamper calculation.
              </p>
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderOrders() {
    return (
      <>
        <PageTitle
          title="Orders"
          subtitle="Record customer orders and track their payment status."
        />

        <section className="panel">
          <h2>Record an order</h2>

          <form className="form-grid" onSubmit={addOrder}>
            <Field label="Customer name">
              <input
                className="form-control"
                value={orderForm.customer}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    customer: event.target.value,
                  })
                }
                required
              />
            </Field>

            <Field label="Hamper">
              <input
                className="form-control"
                value={orderForm.hamper}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    hamper: event.target.value,
                  })
                }
                placeholder="e.g. Luxury Christmas Hamper"
                required
              />
            </Field>

            <Field label="Quantity">
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={orderForm.quantity}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    quantity: event.target.value,
                  })
                }
                required
              />
            </Field>

            <Field label="Order total (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={orderForm.total}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    total: event.target.value,
                  })
                }
                required
              />
            </Field>

            <Field label="Payment status">
              <select
                className="form-select"
                value={orderForm.status}
                onChange={(event) =>
                  setOrderForm({
                    ...orderForm,
                    status: event.target.value,
                  })
                }
              >
                <option>Awaiting payment</option>
                <option>Paid</option>
                <option>Cancelled</option>
              </select>
            </Field>

            <button className="btn btn-dark form-submit" type="submit">
              + Add order
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>All orders</h2>
              <p>{orders.length} orders recorded</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <EmptyState>No orders have been recorded.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table dashboard-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Hamper</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.date}</td>
                      <td>{order.customer}</td>
                      <td>{order.hamper}</td>
                      <td>{order.quantity}</td>
                      <td>{money(order.total)}</td>
                      <td>
                        <select
                          className="form-select status-select"
                          value={order.status}
                          onChange={(event) =>
                            updateOrderStatus(order.id, event.target.value)
                          }
                        >
                          <option>Awaiting payment</option>
                          <option>Paid</option>
                          <option>Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            if (window.confirm("Delete this order?")) {
                              setOrders((current) =>
                                current.filter((item) => item.id !== order.id),
                              );
                              setNotice("Order deleted.");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  function renderExpenses() {
    return (
      <>
        <PageTitle
          title="Expenses"
          subtitle="Track recurring costs and other spending for your hamper business."
        />

        <section className="panel">
          <h2>Add an expense</h2>

          <form className="form-grid" onSubmit={addExpense}>
            <Field label="Expense name">
              <input
                className="form-control"
                value={expenseForm.name}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    name: event.target.value,
                  })
                }
                placeholder="e.g. Website subscription"
                required
              />
            </Field>

            <Field label="Amount (£)">
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: event.target.value,
                  })
                }
                required
              />
            </Field>

            <Field label="Frequency">
              <select
                className="form-select"
                value={expenseForm.frequency}
                onChange={(event) =>
                  setExpenseForm({
                    ...expenseForm,
                    frequency: event.target.value,
                  })
                }
              >
                <option>One-off</option>
                <option>Monthly</option>
                <option>Annual</option>
              </select>
            </Field>

            <button className="btn btn-dark form-submit" type="submit">
              + Add expense
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Expense list</h2>
              <p>All expenses entered into the dashboard</p>
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState>No expenses recorded.</EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="table dashboard-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.name}</td>
                      <td>{money(expense.amount)}</td>
                      <td>{expense.frequency}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setExpenses((current) =>
                              current.filter((item) => item.id !== expense.id),
                            );
                            setNotice("Expense deleted.");
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="expense-total">
            <span>Monthly recurring expenses</span>
            <strong>{money(monthlyExpenses)}</strong>
          </div>
        </section>
      </>
    );
  }

  function renderReports() {
    return (
      <>
        <PageTitle
          title="Reports"
          subtitle="Review your recorded sales, expenses and estimated profit."
        />

        <div className="metric-grid">
          <Metric
            label="Paid revenue"
            value={money(revenue)}
            note="Paid orders only"
            icon="£"
          />
          <Metric
            label="Average paid order"
            value={money(averageOrderValue)}
            note="Average value of paid orders"
            icon="↗"
          />
          <Metric
            label="Monthly expenses"
            value={money(monthlyExpenses)}
            note="Recurring costs recorded"
            icon="↘"
          />
          <Metric
            label="Estimated profit"
            value={money(estimatedProfitFromOrders)}
            note="Using a simplified 50% cost allowance"
            icon="▤"
          />
        </div>

        <section className="panel">
          <h2>Order summary</h2>

          <div className="report-row">
            <span>Total orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="report-row">
            <span>Paid orders</span>
            <strong>{paidOrders.length}</strong>
          </div>
          <div className="report-row">
            <span>Awaiting payment</span>
            <strong>
              {
                orders.filter((order) => order.status === "Awaiting payment")
                  .length
              }
            </strong>
          </div>
          <div className="report-row">
            <span>Cancelled orders</span>
            <strong>
              {orders.filter((order) => order.status === "Cancelled").length}
            </strong>
          </div>
          <div className="report-row">
            <span>Outstanding payments</span>
            <strong>{money(pendingPayments)}</strong>
          </div>

          <div className="info-box mt-4">
            <strong>About these reports</strong>
            <p>
              These are basic management estimates, not formal accounts. The
              profit estimate assumes costs equal 50% of paid sales and then
              deducts monthly recurring expenses. Replace this assumption with
              actual order costs for a more accurate figure. One-off and annual
              expenses are not deducted in this estimate.
            </p>
          </div>

          <button
            className="btn btn-outline-dark mt-3"
            onClick={() => window.print()}
          >
            Print report
          </button>
        </section>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <PageTitle
          title="Settings"
          subtitle="Manage your dashboard preferences and demo data."
        />

        <section className="panel settings-panel">
          <h2>Pricing defaults</h2>
          <p className="section-description">
            Your default target profit margin for the pricing calculator.
          </p>

          <Field label="Target profit margin (%)">
            <input
              className="form-control"
              type="number"
              min="0"
              max="90"
              step="1"
              value={margin}
              onChange={(event) =>
                setMargin(
                  Math.min(90, Math.max(0, Number(event.target.value) || 0)),
                )
              }
            />
          </Field>

          <p className="small-note">
            The dashboard currently uses GBP (£). Currency and pricing settings
            are held in this browser session; the target margin is not yet saved
            as a separate permanent setting.
          </p>

          <hr />

          <h2>Demo data</h2>
          <p className="section-description">
            Restore the sample products, orders and expenses.
          </p>

          <button className="btn btn-outline-danger" onClick={resetDemoData}>
            Reset demo data
          </button>
        </section>

        <section className="panel">
          <h2>Current dashboard setup</h2>

          <div className="report-row">
            <span>Products recorded</span>
            <strong>{products.length}</strong>
          </div>
          <div className="report-row">
            <span>Orders recorded</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="report-row">
            <span>Expenses recorded</span>
            <strong>{expenses.length}</strong>
          </div>

          <div className="info-box mt-4">
            <strong>Data storage</strong>
            <p>
              This starter version stores data in your browser. Clearing your
              browser storage can remove it, and it will not automatically
              appear on another device. A database and secure login can be added
              when you are ready to deploy the full application.
            </p>
          </div>
        </section>
      </>
    );
  }

  const pageRenderers = {
    Dashboard: renderDashboard,
    Products: renderProducts,
    "Hamper Builder": renderHamperBuilder,
    "Pricing Calculator": renderPricingCalculator,
    Orders: renderOrders,
    Expenses: renderExpenses,
    Reports: renderReports,
    Settings: renderSettings,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">G</div>
          <div>
            <strong>GiftBiz</strong>
            <span>HAM PER STUDIO</span>
          </div>
        </div>

        <div className="sidebar-business">
          <div className="business-avatar">GH</div>
          <div>
            <strong>Gift Hamper Business</strong>
            <span>Business workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.heading}>
              <p className="nav-heading">{group.heading}</p>

              {group.items.map((item) => (
                <button
                  key={item.name}
                  className={`nav-link ${page === item.name ? "active" : ""}`}
                  onClick={() => setPage(item.name)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.name}</span>
                  {page === item.name && <span className="active-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div>✦</div>
            <strong>Grow your business</strong>
            <p>Keep your costs organised and your pricing profitable.</p>
            <button onClick={() => setPage("Reports")}>View reports →</button>
          </div>
          <span className="version-label">GiftBiz Dashboard · v1.0</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{page}</strong>
          </div>

          <div className="topbar-right">
            <span className="today-label">
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <div className="user-avatar">GB</div>
          </div>
        </header>

        {notice && (
          <div className="notice-banner" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        <div className="page-content">{pageRenderers[page]()}</div>

        <footer className="app-footer">
          <span>GiftBiz · Hamper Management</span>
          <span>Plan smarter. Price confidently.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
