import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RestaurantOS — Restaurant Operations",
  description: "A unified operating system for modern restaurants."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}