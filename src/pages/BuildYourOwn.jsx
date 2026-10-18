import { useMemo, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FiCheck, FiShoppingBag } from "react-icons/fi";
import { hamperPackages, hamperItems } from "../data/hamperItems";
import { useCart } from "../context/CartContext";

export default function BuildYourOwn() {
  const [selectedPackage, setSelectedPackage] = useState(hamperPackages[1]);

  const [selectedItems, setSelectedItems] = useState([]);

  const [category, setCategory] = useState("All");

  const [recipient, setRecipient] = useState("");

  const [message, setMessage] = useState("");

  const { addToCart } = useCart();

  const categories = [
    "All",
    ...new Set(hamperItems.map((item) => item.category)),
  ];

  const filteredItems =
    category === "All"
      ? hamperItems
      : hamperItems.filter((item) => item.category === category);

  const upgradeTotal = useMemo(
    () => selectedItems.reduce((total, item) => total + item.price, 0),
    [selectedItems],
  );

  const totalPrice = selectedPackage.price + upgradeTotal;

  const remainingItems = selectedPackage.maxItems - selectedItems.length;

  function changePackage(pkg) {
    setSelectedPackage(pkg);

    // Keep the current selection if possible.
    // Otherwise, retain the first items that fit.
    setSelectedItems((current) => current.slice(0, pkg.maxItems));
  }

  function toggleItem(item) {
    const alreadySelected = selectedItems.some(
      (selected) => selected.id === item.id,
    );

    if (alreadySelected) {
      setSelectedItems((current) =>
        current.filter((selected) => selected.id !== item.id),
      );

      return;
    }

    if (selectedItems.length >= selectedPackage.maxItems) {
      window.alert(
        `Your ${selectedPackage.name} allows a maximum of ${selectedPackage.maxItems} items.`,
      );

      return;
    }

    setSelectedItems((current) => [...current, item]);
  }

  function handleAddToBasket() {
    if (selectedItems.length !== selectedPackage.maxItems) {
      window.alert(
        `Please select ${selectedPackage.maxItems} items before continuing.`,
      );

      return;
    }

    const customHamper = {
      id: `custom-${Date.now()}`,
      name: `Build Your Own - ${selectedPackage.name}`,
      price: totalPrice,
      quantity: 1,
      packageName: selectedPackage.name,
      selectedItems: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        upgradePrice: item.price,
        premium: item.premium,
      })),
      recipient,
      message,
    };

    addToCart(customHamper);

    window.alert("Your custom hamper has been added to your basket!");
  }

  return (
    <section className="section-padding hamper-builder">
      <Container>
        <div className="text-center mb-5">
          <span className="hero-label">YOUR GIFT, YOUR WAY</span>

          <h1 className="section-heading mt-3">Build Your Own Hamper</h1>

          <p className="section-subtitle">
            Choose your package, select your favourite gifts and create
            something special.
          </p>
        </div>

        {/* STEP 1: PACKAGE */}

        <div className="builder-section">
          <div className="builder-step-heading">
            <span className="step-number">1</span>

            <div>
              <h2>Choose your package</h2>
              <p>Select the size that suits your budget.</p>
            </div>
          </div>

          <Row className="g-3">
            {hamperPackages.map((pkg) => (
              <Col md={4} key={pkg.id}>
                <button
                  type="button"
                  className={`package-card ${
                    selectedPackage.id === pkg.id ? "selected" : ""
                  }`}
                  onClick={() => changePackage(pkg)}
                  aria-pressed={selectedPackage.id === pkg.id}
                >
                  <span className="package-name">{pkg.name}</span>

                  <span className="package-price">£{pkg.price.toFixed(2)}</span>

                  <span className="package-description">{pkg.description}</span>

                  <span className="package-limit">
                    Up to {pkg.maxItems} items
                  </span>

                  {selectedPackage.id === pkg.id && (
                    <span className="package-check">
                      <FiCheck />
                    </span>
                  )}
                </button>
              </Col>
            ))}
          </Row>
        </div>

        {/* STEP 2: PRODUCTS */}

        <div className="builder-section">
          <div className="builder-step-heading">
            <span className="step-number">2</span>

            <div>
              <h2>Choose your gifts</h2>

              <p>
                Select {selectedPackage.maxItems} items. Premium upgrades cost
                extra.
              </p>
            </div>
          </div>

          <div className="selection-status">
            <span>
              Selected: {selectedItems.length} / {selectedPackage.maxItems}
            </span>

            <span>
              {remainingItems} item
              {remainingItems === 1 ? "" : "s"} remaining
            </span>
          </div>

          <div className="item-progress">
            <div
              className="item-progress-fill"
              style={{
                width: `${
                  (selectedItems.length / selectedPackage.maxItems) * 100
                }%`,
              }}
            />
          </div>

          <div className="category-filters">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={`category-button ${
                  category === item ? "active" : ""
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <Row className="g-4">
            {filteredItems.map((item) => {
              const selected = selectedItems.some(
                (selectedItem) => selectedItem.id === item.id,
              );

              const limitReached =
                selectedItems.length >= selectedPackage.maxItems;

              return (
                <Col sm={6} lg={3} key={item.id}>
                  <article
                    className={`builder-product ${
                      selected ? "product-selected" : ""
                    }`}
                  >
                    <div className="builder-product-image-wrap">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="builder-product-image"
                        loading="lazy"
                      />

                      {item.premium && (
                        <span className="premium-badge">Premium</span>
                      )}

                      {selected && (
                        <span className="selected-badge">
                          <FiCheck />
                        </span>
                      )}
                    </div>

                    <div className="builder-product-info">
                      <h3>{item.name}</h3>

                      <p className="text-muted small">{item.category}</p>

                      <div className="builder-product-bottom">
                        <strong>
                          {item.price === 0
                            ? "Included"
                            : `+£${item.price.toFixed(2)}`}
                        </strong>

                        <button
                          type="button"
                          className={
                            selected
                              ? "item-button selected-button"
                              : "item-button"
                          }
                          disabled={!selected && limitReached}
                          onClick={() => toggleItem(item)}
                        >
                          {selected ? "Remove" : "Add"}
                        </button>
                      </div>
                    </div>
                  </article>
                </Col>
              );
            })}
          </Row>
        </div>

        {/* STEP 3: PERSONALISATION */}

        <div className="builder-section">
          <div className="builder-step-heading">
            <span className="step-number">3</span>

            <div>
              <h2>Personalise your gift</h2>

              <p>Add a recipient name and a thoughtful message.</p>
            </div>
          </div>

          <Row className="g-4">
            <Col md={5}>
              <label htmlFor="recipient" className="form-label">
                Recipient name
              </label>

              <input
                id="recipient"
                type="text"
                className="form-control"
                placeholder="Who is the gift for?"
                value={recipient}
                maxLength={100}
                onChange={(event) => setRecipient(event.target.value)}
              />
            </Col>

            <Col md={7}>
              <label htmlFor="gift-message" className="form-label">
                Personal message
              </label>

              <textarea
                id="gift-message"
                className="form-control"
                rows="3"
                placeholder="Write your message here..."
                value={message}
                maxLength={300}
                onChange={(event) => setMessage(event.target.value)}
              />

              <small className="text-muted">
                {message.length}/300 characters
              </small>
            </Col>
          </Row>
        </div>

        {/* STEP 4: SUMMARY */}

        <div className="builder-summary">
          <div>
            <h2>Your Hamper</h2>

            <p>
              {selectedPackage.name} · {selectedItems.length} of{" "}
              {selectedPackage.maxItems} items selected
            </p>

            <p>Package price: £{selectedPackage.price.toFixed(2)}</p>

            <p>Premium upgrades: £{upgradeTotal.toFixed(2)}</p>

            <h3 className="summary-total">Total: £{totalPrice.toFixed(2)}</h3>
          </div>

          <button
            type="button"
            className="btn-hamper summary-button"
            disabled={selectedItems.length !== selectedPackage.maxItems}
            onClick={handleAddToBasket}
          >
            <FiShoppingBag className="me-2" />
            Add Hamper to Basket
          </button>
        </div>
      </Container>
    </section>
  );
}
