import { Link } from "react-router-dom";
import { FaEnvelope, FaGift } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <FaGift />
              <span>The Gift Collection</span>
            </Link>

            <p>
              Thoughtful gifts, carefully selected and beautifully presented for
              life's special moments.
            </p>

            <Link to="/build-your-own" className="footer-cta">
              Build Your Own Hamper
            </Link>
          </div>

          <div className="footer-links">
            <h3>Explore</h3>

            <Link to="/shop">Shop All Hampers</Link>
            <Link to="/build-your-own">Build Your Own</Link>
            <Link to="/about">Our Story</Link>
            <Link to="/contact">Contact Us</Link>
          </div>

          <div className="footer-links">
            <h3>Customer Care</h3>

            <Link to="/contact">Contact & Enquiries</Link>

            {/* Add these pages before launch. */}
            <a href="/delivery-information">Delivery Information</a>

            <a href="/returns-policy">Returns Policy</a>

            <a href="/privacy-policy">Privacy Policy</a>
          </div>

          <div className="footer-contact">
            <h3>Need a Hand?</h3>

            <p>
              Questions about a gift or a larger order? Get in touch with us.
            </p>

            <Link to="/contact" className="footer-contact-link">
              <FaEnvelope />
              Contact Our Team
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} The Gift Collection. All rights
            reserved.
          </p>

          <p>Thoughtfully chosen. Beautifully gifted.</p>
        </div>
      </div>
    </footer>
  );
}
