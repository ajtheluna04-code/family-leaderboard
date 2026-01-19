import "./globals.css";
import AuthHashHandler from "./AuthHashHandler";
import localFont from "next/font/local";

const catanHeading = localFont({
  src: "./fonts/Minion Pro Semibold Cond Subhead.otf",
  display: "swap",
  variable: "--font-heading",
});

export const metadata = { title: "Family Games Leaderboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={catanHeading.variable}>
      <body>
        <AuthHashHandler />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
