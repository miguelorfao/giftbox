import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`}>
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"
        />
      </Link>

      <div className="product-info">
        <span className="text-muted small">{product.category}</span>

        <h3 className="h5 mt-2">{product.name}</h3>

        <p className="text-muted">{product.description}</p>

        <div className="d-flex justify-content-between align-items-center gap-2">
          <span className="product-price">£{product.price.toFixed(2)}</span>

          <Link to={`/product/${product.id}`} className="btn-hamper-outline">
            View Gift
          </Link>
        </div>
      </div>
    </article>
  );
}
