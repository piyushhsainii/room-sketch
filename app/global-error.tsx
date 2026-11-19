"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f5f5f5", color: "#171717", fontFamily: "system-ui" }}>
        <main role="alert" style={{ maxWidth: "30rem", margin: "15vh auto", padding: "2rem" }}>
          <h1>RoomSketch could not open</h1>
          <p>Something went wrong while opening this page. Please try again.</p>
          <button type="button" onClick={reset}>Try again</button>{" "}
          <a href="/">Go home</a>
        </main>
      </body>
    </html>
  );
}
