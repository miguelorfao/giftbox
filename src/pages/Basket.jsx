import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import {
  FiTrash2,
  FiPlus,
  FiMinus,
  FiShoppingBag,
  FiArrowLeft,
} from "react-icons/fi";

import { useCart } from "../context/CartContext";

export default function Basket() {
  const { cart, total, removeFromCart, updateQuantity } = useCart();

  // Empty basket
  if (cart.length === 0) {
    return (
      <section className="section-padding basket-page">
        <Container>
          <div className="empty-basket">
            <div className="empty-basket-icon">
              <FiShoppingBag />
            </div>

            <h1>Your basket is empty</h1>

            <p>
              Your perfect gift is waiting to be created. Explore our hampers
              and find something special.
            </p>

            <div className="empty-basket-buttons">
              <Link to="/shop" className="btn-hamper">
                Browse Hampers
              </Link>

              <Link to="/build-your-own" className="btn-hamper-outline">
                Build Your Own
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="section-padding basket-page">
      <Container>
        <div className="basket-heading">
          <span className="hero-label">YOUR SELECTION</span>

          <h1 className="section-heading mt-3">Your Shopping Basket</h1>

          <p>Review your gifts before proceeding to checkout.</p>
        </div>

        <Row className="g-4">
          {/* LEFT: BASKET ITEMS */}

          <Col lg={8}>
            <div className="basket-items-panel">
              <div className="basket-panel-heading">
                <h2>Your Items</h2>

                <span>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                </span>
              </div>

              {cart.map((item) => {
                const isCustomHamper = item.id.toString().startsWith("custom-");

                return (
                  <article className="basket-item" key={item.id}>
                    <div className="basket-item-image">
                      <img
                        src={
                          item.image ||
                          item.selectedItems?.[0]?.image ||
                          "/images/placeholder.jpg"
                        }
                        alt={item.name}
                      />
                    </div>

                    <div className="basket-item-details">
                      <div className="basket-item-top">
                        <div>
                          <h3>{item.name}</h3>

                          {item.category && (
                            <p className="basket-category">{item.category}</p>
                          )}

                          {item.packageName && (
                            <p className="basket-category">
                              Package: {item.packageName}
                            </p>
                          )}
                        </div>

                        <strong className="basket-item-price">
                          £{(item.price * item.quantity).toFixed(2)}
                        </strong>
                      </div>

                      {/* CUSTOM HAMPER CONTENTS */}

                      {isCustomHamper && item.selectedItems && (
                        <div className="custom-hamper-details">
                          <h4>Selected gifts</h4>

                          <ul>
                            {item.selectedItems.map((gift, index) => (
                              <li key={`${gift.id}-${index}`}>
                                <span>{gift.name}</span>

                                {gift.upgradePrice > 0 && (
                                  <span>
                                    +£
                                    {gift.upgradePrice.toFixed(2)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>

                          {item.recipient && (
                            <p>
                              <strong>For:</strong> {item.recipient}
                            </p>
                          )}

                          {item.message && (
                            <div className="gift-message-preview">
                              <strong>Gift message</strong>

                              <p>{item.message}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="basket-item-actions">
                        <div className="quantity-control">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <FiMinus />
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.name}`}
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <FiPlus />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <FiTrash2 />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              <Link to="/shop" className="continue-shopping">
                <FiArrowLeft />
                Continue shopping
              </Link>
            </div>
          </Col>

          {/* RIGHT: ORDER SUMMARY */}

          <Col lg={4}>
            <aside className="order-summary">
              <h2>Order Summary</h2>

              <div className="summary-row">
                <span>Subtotal</span>
                <strong>£{total.toFixed(2)}</strong>
              </div>

              <div className="summary-row">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>

              <div className="summary-divider" />

              <div className="summary-row summary-total-row">
                <span>Total</span>
                <strong>£{total.toFixed(2)}</strong>
              </div>

              <p className="delivery-note">
                Delivery charges, where applicable, will be confirmed before
                payment.
              </p>

              <button
                type="button"
                className="btn-hamper checkout-button"
                onClick={() => {
                  window.alert(
                    "Checkout will be available when we connect Shopify.",
                  );
                }}
              >
                Proceed to Checkout
              </button>

              <Link to="/build-your-own" className="customise-link">
                Create another custom hamper
              </Link>

              <div className="basket-benefits">
                <p>✓ Carefully selected gifts</p>
                <p>✓ Personalised gift messages</p>
                <p>✓ Secure checkout coming soon</p>
              </div>
            </aside>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
