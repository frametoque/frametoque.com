export const dynamic = "force-static"; // Next.js ensures it’s fully static

export default function Offline() {
  return (
    <html lang="en">
      <body style={{ textAlign: "center", padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Oops! You are offline 😔</h1>
        <p>Check your internet connection and try again.</p>
      </body>
    </html>
  );
}
