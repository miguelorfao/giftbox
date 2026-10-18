import { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { products } from "../data/products";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    ...new Set(products.map((product) => product.category)),
  ];

  const filteredProducts =
    category === "All"
      ? products
      : products.filter((product) => product.category === category);

  return (
    <section className="section-padding">
      <Container>
        <div className="text-center mb-5">
          <span className="hero-label">OUR COLLECTION</span>

          <h1 className="section-heading mt-3">Shop Gift Hampers</h1>

          <p className="section-subtitle">
            Discover gifts for every occasion and budget.
          </p>
        </div>

        <div className="category-filters">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={
                category === item ? "category-button active" : "category-button"
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <Row className="g-4">
          {filteredProducts.map((product) => (
            <Col key={product.id} sm={6} lg={4}>
              <ProductCard product={product} />
            </Col>
          ))}
        </Row>

        {filteredProducts.length === 0 && (
          <p className="text-center mt-5">
            No products found in this category.
          </p>
        )}
      </Container>
    </section>
  );
}
