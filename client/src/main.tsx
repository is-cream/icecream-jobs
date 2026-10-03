import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { MantineProvider } from "@mantine/core";
import { spaceQueryClient } from "@hatch/space-sdk/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme.css";

const rootEl = document.querySelector<HTMLElement>("[data-generated-space-root]");
if (!rootEl) {
  throw new Error("missing generated space root element");
}

// If you edit this file: keep `<QueryClientProvider client={spaceQueryClient}>`
// wrapping the app (every space shares the SDK's QueryClient), and keep
// BOTH the `hatch-space-root` class AND the `data-hatch-space-root`
// attribute on the outer div. The SDK styles select on
// `.hatch-space-root[data-hatch-space-root]` to apply mobile safe-area
// insets (notches, gesture bars, etc.), correct viewport sizing, and the
// hosting header/chrome offsets — dropping either breaks layout silently.
createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={spaceQueryClient}>
      <MantineProvider
        defaultColorScheme="auto"
        theme={{ fontFamily: "inherit", primaryColor: "teal" }}
      >
        <div className="hatch-space-root" data-hatch-space-root>
          <App />
        </div>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
