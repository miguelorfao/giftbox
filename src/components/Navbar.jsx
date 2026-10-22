import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiShoppingBag, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart } = useCart();

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar navbar-expand-lg hamper-navbar">
      <div className="container">
        <Link to="/" className="navbar-brand hamper-brand" onClick={closeMenu}>
          <span className="brand-title">The Gift Collection</span>
          <small>Thoughtfully chosen. Beautifully presented.</small>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>

        <div className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`}>
          <div className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
            <NavLink to="/" className="nav-link" onClick={closeMenu}>
              Home
            </NavLink>

            <NavLink to="/shop" className="nav-link" onClick={closeMenu}>
              Shop
            </NavLink>

            <NavLink
              to="/build-your-own"
              className="nav-link"
              onClick={closeMenu}
            >
              Build Your Own
            </NavLink>

            <NavLink to="/about" className="nav-link" onClick={closeMenu}>
              About
            </NavLink>

            <NavLink to="/contact" className="nav-link" onClick={closeMenu}>
              Contact
            </NavLink>
            <NavLink to="/dashboard" className="nav-link" onClick={closeMenu}>
              Admin
            </NavLink>

            <Link
              to="/basket"
              className="basket-link"
              aria-label={`Shopping basket, ${cartCount} items`}
              onClick={closeMenu}
            >
              <FiShoppingBag />
              <span>Basket ({cartCount})</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
