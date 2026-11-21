import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[main.tsx] Starting render...");
try {
  const rootEl = document.getElementById("root");
  console.log("[main.tsx] Root element:", rootEl);
  const root = createRoot(rootEl!);
  console.log("[main.tsx] createRoot done, calling render...");
  root.render(<App />);
  console.log("[main.tsx] render() called successfully");
} catch (err) {
  console.error("[main.tsx] RENDER ERROR:", err);
  document.body.innerHTML = `<pre style="color:red;padding:2rem;">RENDER ERROR: ${err}</pre>`;
}
