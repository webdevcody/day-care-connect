import React from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/lib/theme";
import appCss from "../styles.css?url";

const themeScript = `(function(){try{var t=localStorage.getItem("daycare-theme")||"system";var d=t==="system"?window.matchMedia("(prefers-color-scheme:dark)").matches:t==="dark";if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DayCareConnect" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">Page not found</p>
      <a
        href="/"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Go Home
      </a>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
