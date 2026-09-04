import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./app/App.tsx";
import { AuthProvider } from "./lib/auth-context.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <>
    <AuthProvider>
      <App />
    </AuthProvider>
    <Toaster position="top-right" reverseOrder={false} />
  </>
);
