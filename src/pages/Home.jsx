import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { products } from "../data/products";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const featuredProducts = products.filter((product) => product.featured);

  return (
    <>
      <section className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="hero-content">
              <span className="hero-label">THE ART OF GIFTING</span>

              <h1>
                Gifts that make
                <br />
                <span>every moment</span>
                <br />
                special.
              </h1>

              <p>
                Discover beautifully presented gift hampers filled with
                thoughtful treats. Choose a ready-made gift or create something
                personal.
              </p>

              <div className="hero-buttons">
                <Link to="/shop" className="btn-hamper">
                  Explore Hampers
                </Link>

                <Link to="/build-your-own" className="btn-hamper-outline">
                  Build Your Own
                </Link>
              </div>

              <div className="hero-trust">
                Thoughtfully selected · Beautifully presented
              </div>
            </Col>

            <Col lg={6}>
              <div className="hero-image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85"
                  alt="Beautifully presented gifts ready to give"
                  className="hero-image"
                />

                <div className="hero-note">
                  <span>Made with care</span>
                  <strong>Given with love</strong>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="section-padding">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-heading">Find the perfect gift</h2>

            <p className="section-subtitle">
              Whether you're celebrating Christmas, saying thank you or simply
              making someone's day, there's a hamper for every occasion.
            </p>
          </div>

          <Row className="g-4">
            {featuredProducts.map((product) => (
              <Col key={product.id} sm={6} lg={4}>
                <ProductCard product={product} />
              </Col>
            ))}
          </Row>

          <div className="text-center mt-5">
            <Link to="/shop" className="btn-hamper">
              View All Hampers
            </Link>
          </div>
        </Container>
      </section>

      <section className="build-banner">
        <Container>
          <Row className="align-items-center g-4">
            <Col lg={8}>
              <span className="hero-label">MAKE IT PERSONAL</span>

              <h2 className="section-heading mt-3">Your gift. Your way.</h2>

              <p>
                Choose your favourite treats, select your packaging and add a
                personal message to create a gift that's uniquely yours.
              </p>
            </Col>

            <Col lg={4} className="text-lg-end">
              <Link to="/build-your-own" className="btn-hamper">
                Create Your Hamper
              </Link>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
}
