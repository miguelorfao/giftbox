import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { catalogImageUrl, loadPublicCatalog } from "../storeApi";

const CartContext = createContext(null);
const fallbackImage =
  "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=85";

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("hamper-cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const catalog = await loadPublicCatalog();
      const categoryNames = new Map(
        catalog.categories.map((category) => [category.id, category.name]),
      );
      setProducts(
        catalog.products.map((product) => {
          const category = (product.categoryIds || [])
            .map((id) => categoryNames.get(id))
            .filter(Boolean)
            .join(", ");
          return {
            ...product,
            price: product.priceMinor / 100,
            stock:
              product.status === "active" ? product.stockQuantity : 0,
            category: category || "Gifts",
            image: product.image
              ? catalogImageUrl(product.image)
              : fallbackImage,
            longDescription: product.description,
            includes: [],
          };
        }),
      );
      setCategories(catalog.categories);
      setSettings(catalog.settings);
    } catch (error) {
      console.error("Could not load the shop catalog.", error);
      setCatalogError("Gifts could not be loaded. Please try again.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    localStorage.setItem("hamper-cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  }

  function updateQuantity(productId, quantity) {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item,
      ),
    );
  }

  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const builderProducts = products
    .filter(
      (product) =>
        product.status === "active" && product.productType === "component",
    )
    .map((product) => ({
      ...product,
      note: product.note || product.description,
    }));

  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        products,
        categories,
        builderProducts,
        settings,
        catalogLoading,
        catalogError,
        refreshCatalog,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
