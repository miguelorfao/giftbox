import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { FaGift, FaHeart, FaStar } from "react-icons/fa";

export default function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <Container>
          <div className="about-hero-content">
            <span className="section-eyebrow">OUR STORY</span>

            <h1>Thoughtful Gifts, Beautifully Presented</h1>

            <p>
              We believe the best gifts are the ones that make people feel
              special. Our hampers bring together carefully selected treats and
              thoughtful touches for life's little moments.
            </p>

            <Link to="/shop" className="btn-hamper-primary">
              Explore Our Hampers
            </Link>
          </div>
        </Container>
      </section>

      <section className="about-story section-padding">
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <img
                src="https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85"
                alt="Beautifully presented gift"
                className="about-story-image"
                loading="lazy"
              />
            </Col>

            <Col lg={6}>
              <span className="section-eyebrow">A LITTLE ABOUT US</span>

              <h2>Every Gift Tells a Story</h2>

              <p>
                Whether you're celebrating a birthday, saying thank you, sharing
                Christmas cheer or simply brightening someone's day, we want
                every hamper to feel thoughtful.
              </p>

              <p>
                From ready-made gift collections to our build-your-own hamper
                experience, we're here to help you find something that feels
                just right.
              </p>

              <p>
                We want choosing a gift to be enjoyable, personal and
                straightforward from start to finish.
              </p>

              <Link to="/build-your-own" className="btn-hamper-outline">
                Create Your Own Hamper
              </Link>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="about-values section-padding">
        <Container>
          <div className="section-heading text-center">
            <span className="section-eyebrow">WHAT MATTERS TO US</span>

            <h2>The Little Things Make a Difference</h2>
          </div>

          <Row className="g-4 mt-3">
            <Col md={4}>
              <article className="value-card">
                <FaGift className="value-icon" />

                <h3>Thoughtful Selection</h3>

                <p>
                  We aim to bring together enjoyable gifts and treats that make
                  every hamper feel special.
                </p>
              </article>
            </Col>

            <Col md={4}>
              <article className="value-card">
                <FaHeart className="value-icon" />

                <h3>Made for Giving</h3>

                <p>
                  From family celebrations to thoughtful client gifts, we help
                  you find the right way to show you care.
                </p>
              </article>
            </Col>

            <Col md={4}>
              <article className="value-card">
                <FaStar className="value-icon" />

                <h3>Your Personal Touch</h3>

                <p>
                  Add a personal message and choose items to create a gift that
                  feels more individual.
                </p>
              </article>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="about-cta">
        <Container>
          <h2>Find Something They'll Love</h2>

          <p>
            Discover a ready-made hamper or create something entirely your own.
          </p>

          <Link to="/shop" className="btn-hamper-light">
            Shop Gift Hampers
          </Link>
        </Container>
      </section>
    </main>
  );
}
