import { useState } from "react";
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
import { createOrderRequest } from "../storeApi";

export default function Basket() {
  const { cart, total, removeFromCart, updateQuantity, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [order, setOrder] = useState(null);

  async function placeOrder(event) {
    event.preventDefault();
    setCheckoutError("");
    setCheckoutSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await createOrderRequest({
        customer: {
          name: formData.get("fullName"),
          email: formData.get("email"),
          telephone: formData.get("telephone"),
        },
        deliveryAddress: {
          line1: formData.get("address"),
          line2: formData.get("address2"),
          city: formData.get("city"),
          postcode: formData.get("postcode"),
          instructions: formData.get("instructions"),
          preferredDate: formData.get("preferredDate"),
        },
        items: cart.map((item) =>
          item.customDetails
            ? {
                quantity: item.quantity,
                customDetails: item.customDetails,
              }
            : { productId: String(item.id), quantity: item.quantity },
        ),
      });
      setOrder({
        reference: result.reference,
        estimatedTotal: result.estimatedTotalMinor,
        name: formData.get("fullName"),
      });
      clearCart();
      setCheckoutOpen(false);
    } catch (error) {
      console.error("Could not place the gift request.", error);
      setCheckoutError(error.message || "The request could not be placed.");
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  if (order) {
    return (
      <section className="section-padding basket-page">
        <Container>
          <div className="empty-basket">
            <div className="empty-basket-icon">
              <FiShoppingBag />
            </div>
            <h1>Thank you, {order.name}</h1>
            <p>Your gift request has been received.</p>
            <p>
              <strong>Reference: {order.reference}</strong>
            </p>
            <p>
              Estimated total: £{(order.estimatedTotal / 100).toFixed(2)}
            </p>
            <p>
              We’ll check availability and confirm the final total and payment
              instructions before you pay.
            </p>
            <Link to="/" className="btn-hamper">
              Continue browsing
            </Link>
          </div>
        </Container>
      </section>
    );
  }

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
                onClick={() => setCheckoutOpen((open) => !open)}
              >
                {checkoutOpen ? "Close Checkout" : "Proceed to Checkout"}
              </button>

              <Link to="/build-your-own" className="customise-link">
                Create another custom hamper
              </Link>

              <div className="basket-benefits">
                <p>✓ Carefully selected gifts</p>
                <p>✓ Personalised gift messages</p>
                <p>✓ No payment is taken until your request is confirmed</p>
              </div>
            </aside>
          </Col>
        </Row>

        {checkoutOpen && (
          <div className="checkout-panel mt-4">
            <h2>Delivery details</h2>
            <p>
              Submit your request now. We’ll confirm availability, the final
              amount and BACS instructions before payment.
            </p>
            {checkoutError && (
              <p className="alert alert-danger" role="alert">
                {checkoutError}
              </p>
            )}
            <form onSubmit={placeOrder}>
              <Row className="g-3">
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-name">
                    Full name
                  </label>
                  <input
                    className="form-control"
                    id="checkout-name"
                    name="fullName"
                    autoComplete="name"
                    maxLength={120}
                    required
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-email">
                    Email address
                  </label>
                  <input
                    className="form-control"
                    id="checkout-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-phone">
                    Telephone
                  </label>
                  <input
                    className="form-control"
                    id="checkout-phone"
                    name="telephone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    required
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-address">
                    Address line 1
                  </label>
                  <input
                    className="form-control"
                    id="checkout-address"
                    name="address"
                    autoComplete="address-line1"
                    maxLength={150}
                    required
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-address2">
                    Address line 2
                  </label>
                  <input
                    className="form-control"
                    id="checkout-address2"
                    name="address2"
                    autoComplete="address-line2"
                    maxLength={150}
                  />
                </Col>
                <Col md={3}>
                  <label className="form-label" htmlFor="checkout-city">
                    Town or city
                  </label>
                  <input
                    className="form-control"
                    id="checkout-city"
                    name="city"
                    autoComplete="address-level2"
                    maxLength={100}
                    required
                  />
                </Col>
                <Col md={3}>
                  <label className="form-label" htmlFor="checkout-postcode">
                    Postcode
                  </label>
                  <input
                    className="form-control"
                    id="checkout-postcode"
                    name="postcode"
                    autoComplete="postal-code"
                    maxLength={20}
                    required
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-date">
                    Preferred delivery date
                  </label>
                  <input
                    className="form-control"
                    id="checkout-date"
                    name="preferredDate"
                    type="date"
                  />
                </Col>
                <Col md={6}>
                  <label className="form-label" htmlFor="checkout-instructions">
                    Delivery instructions
                  </label>
                  <input
                    className="form-control"
                    id="checkout-instructions"
                    name="instructions"
                    maxLength={500}
                  />
                </Col>
              </Row>
              <button
                type="submit"
                className="btn-hamper checkout-button mt-3"
                disabled={checkoutSubmitting}
              >
                {checkoutSubmitting ? "Submitting..." : "Submit gift request"}
              </button>
            </form>
          </div>
        )}
      </Container>
    </section>
  );
}
