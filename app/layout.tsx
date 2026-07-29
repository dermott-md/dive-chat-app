import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "./components/NavBar";

export const metadata: Metadata = {
  title: "Data Portal — powered by MotherDuck",
  description: "Explore dives, chat with your data, and build reports from natural language.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <NavBar />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
