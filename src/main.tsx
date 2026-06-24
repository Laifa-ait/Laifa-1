import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./config/sentry";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ShopProvider } from "./context/ShopContext";
import { UIProvider } from "./context/UIContext";
import { MegaMenuProvider } from "./context/MegaMenuContext";
import { Toaster } from "react-hot-toast";

if ("serviceWorker" in navigator) {
  const isDevOrPreview =
    window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("-dev-") ||
    window.location.hostname.includes("-pre-") ||
    window.location.hostname.includes(".run.app") ||
    (import.meta as any).env?.DEV;

  if (!isDevOrPreview) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          (process.env.NODE_ENV === "debug" ? console.log : function () {})("SW registered: ", registration);
        })
        .catch((registrationError) => {
          (process.env.NODE_ENV === "debug" ? console.log : function () {})(
            "SW registration failed: ",
            registrationError
          );
        });
    });
  } else {
    // Clean up active service workers in development/preview to prevent stale bundle load / white screen blocks
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          if ("caches" in window) {
            caches.keys().then((keys) => {
              keys.forEach((key) => caches.delete(key));
            });
          }
        });
      }
    });
  }
}

import { setupErrorAgent, logReactErrorBoundary } from "./utils/errorAgent";
import { useTranslation } from "react-i18next";

// Initialize the global error agent
setupErrorAgent();

const I18nLoader = () => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9f4e8",
        color: "#3C2B22",
        fontWeight: 600,
      }}
    >
      Initialisation...
    </div>
  );
};

const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9f4e8",
        color: "#3C2B22",
        fontWeight: 600,
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Erreur inattendue</h2>
      <p style={{ marginBottom: "24px", opacity: 0.8 }}>{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: "10px 24px",
          backgroundColor: "#3C2B22",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Rafraîchir
      </button>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
      onError={logReactErrorBoundary}
    >
      <Suspense fallback={<I18nLoader />}>
        <HelmetProvider>
          <BrowserRouter>
            <AuthProvider>
              <ShopProvider>
                <CartProvider>
                  <UIProvider>
                    <MegaMenuProvider>
                      <App />
                      <Toaster
                        position="top-center"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: "#18181b",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            borderRadius: "16px",
                            letterSpacing: "0.025em",
                            textTransform: "uppercase",
                            border: "1px solid rgba(255,255,255,0.1)",
                          },
                        }}
                      />
                    </MegaMenuProvider>
                  </UIProvider>
                </CartProvider>
              </ShopProvider>
            </AuthProvider>
          </BrowserRouter>
        </HelmetProvider>
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);
