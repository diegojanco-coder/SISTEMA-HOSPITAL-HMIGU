import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./app/App.tsx";
import { AuthProvider } from "./lib/auth-context.tsx";
import "./styles/index.css";
import ThemeSwitch, { initialTheme } from "./app/components/ThemeSwitch";
document.documentElement.classList.toggle("dark", initialTheme());

createRoot(document.getElementById("root")!).render(
  <>
    <AuthProvider>
      <App />
      <ThemeSwitch />
    </AuthProvider>
    <Toaster position="top-right" reverseOrder={false} />
  </>
);
