import { BrowserRouter, Routes, Route } from "react-router-dom";

import { CartProvider } from "./context/CartContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import BuildYourOwn from "./pages/BuildYourOwn";
import ProductDetails from "./pages/ProductDetails";
import Basket from "./pages/Basket";
import About from "./pages/About";
import Contact from "./pages/Contact";

function NotFound() {
  return (
    <main className="container text-center py-5">
      <h1>Page Not Found</h1>

      <p>Sorry, we couldn't find the page you were looking for.</p>

      <a href="/" className="btn-hamper-primary">
        Return Home
      </a>
    </main>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/shop" element={<Shop />} />

          <Route path="/build-your-own" element={<BuildYourOwn />} />

          <Route path="/product/:id" element={<ProductDetails />} />

          <Route path="/basket" element={<Basket />} />

          <Route path="/about" element={<About />} />

          <Route path="/contact" element={<Contact />} />

          <Route path="*" element={<NotFound />} />
        </Routes>

        <Footer />
      </BrowserRouter>
    </CartProvider>
  );
}
