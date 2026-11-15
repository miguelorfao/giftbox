import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { FiShoppingBag, FiCheck, FiArrowLeft } from "react-icons/fi";

import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";

export default function ProductDetails() {
  const { id } = useParams();
  const { products, catalogLoading, catalogError, addToCart } = useCart();
  const product = products.find((item) => String(item.id) === id);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <Container className="section-padding text-center">
        <h1>{catalogLoading ? "Loading gift..." : "Product not found"}</h1>

        <p>
          {catalogError ||
            "Sorry, we couldn't find the hamper you're looking for."}
        </p>

        <Link to="/shop" className="btn-hamper">
          Return to Shop
        </Link>
      </Container>
    );
  }

  const recommendations = products
    .filter(
      (item) => item.id !== product.id && item.category === product.category,
    )
    .concat(
      products.filter(
        (item) => item.id !== product.id && item.category !== product.category,
      ),
    )
    .slice(0, 3);

  function handleAddToBasket() {
    addToCart(product);

    // Add the remaining quantity if more than one was selected.
    if (quantity > 1) {
      const additionalQuantity = quantity - 1;

      for (let i = 0; i < additionalQuantity; i++) {
        addToCart(product);
      }
    }

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 3000);
  }

  return (
    <section className="section-padding product-details-page">
      <Container>
        <Link to="/shop" className="product-back-link">
          <FiArrowLeft />
          Back to Shop
        </Link>

        <Row className="g-5 align-items-start">
          {/* PRODUCT IMAGE */}

          <Col lg={6}>
            <div className="product-details-image-wrapper">
              <img
                src={product.image}
                alt={product.name}
                className="product-details-image"
              />

              {product.featured && (
                <span className="details-featured-badge">
                  Customer Favourite
                </span>
              )}
            </div>
          </Col>

          {/* PRODUCT INFORMATION */}

          <Col lg={6}>
            <div className="product-details-content">
              <span className="hero-label">
                {product.category.toUpperCase()}
              </span>

              <h1>{product.name}</h1>

              <p className="product-details-price">
                £{product.price.toFixed(2)}
              </p>

              <p className="product-details-description">
                {product.longDescription || product.description}
              </p>

              <div className="product-stock">
                <span className="stock-dot" />

                {product.stock > 0
                  ? "Available to order"
                  : "Currently unavailable"}
              </div>

              <div className="product-includes">
                <h2>What's included</h2>

                <ul>
                  {product.includes?.map((item) => (
                    <li key={item}>
                      <FiCheck />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="product-quantity-section">
                <label htmlFor="product-quantity">Quantity</label>

                <div className="product-quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock}
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(product.stock, current + 1),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="product-details-total">
                <span>Total</span>

                <strong>£{(product.price * quantity).toFixed(2)}</strong>
              </div>

              <button
                type="button"
                className="btn-hamper product-add-button"
                disabled={product.stock <= 0}
                onClick={handleAddToBasket}
              >
                <FiShoppingBag />

                {added ? "Added to Basket!" : "Add to Basket"}
              </button>

              {added && (
                <div className="product-added-message" role="status">
                  <FiCheck />

                  <span>
                    {quantity} × {product.name} added to your basket.
                  </span>

                  <Link to="/basket">View Basket</Link>
                </div>
              )}

              <div className="product-details-note">
                <p>Beautifully presented and ready to give.</p>

                <p>Delivery costs will be confirmed at checkout.</p>
              </div>
            </div>
          </Col>
        </Row>

        {/* RECOMMENDED PRODUCTS */}

        {recommendations.length > 0 && (
          <section className="recommended-products">
            <div className="text-center mb-5">
              <h2 className="section-heading">You May Also Like</h2>

              <p className="section-subtitle">
                Discover more thoughtful gifts from our collection.
              </p>
            </div>

            <Row className="g-4">
              {recommendations.map((item) => (
                <Col key={item.id} sm={6} lg={4}>
                  <ProductCard product={item} />
                </Col>
              ))}
            </Row>
          </section>
        )}
      </Container>
    </section>
  );
}
