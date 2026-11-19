"use client";

export default function PageFailure({ title = "This page could not be opened", message = "Something went wrong. Try again, or return to your projects.", onRetry, signInHref }: {
  title?: string;
  message?: string;
  onRetry: () => void;
  signInHref?: string;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-neutral-100 px-5 text-neutral-900">
      <section role="alert" className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {signInHref && <a href={signInHref} className="rounded-full bg-neutral-900 px-4 py-2 text-white">Sign in</a>}
          <button type="button" onClick={onRetry} className="rounded-full bg-neutral-900 px-4 py-2 text-white">Try again</button>
          <a href="/dashboard" className="rounded-full border border-neutral-300 px-4 py-2">Back to projects</a>
          <a href="/" className="rounded-full px-4 py-2 underline">Go home</a>
        </div>
      </section>
    </main>
  );
}
