"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  configured: boolean;
  connected: boolean;
  callbackStatus?: string;
};

export default function DashboardAgent({ configured, connected, callbackStatus }: Props) {
  const [open, setOpen] = useState(callbackStatus === "connected" || callbackStatus === "failed");
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = dialog.current;
    if (open && !panel?.open) panel?.showModal();
    if (!open && panel?.open) panel.close();
  }, [open]);

  return (
    <>
      <button
        ref={launcher}
        type="button"
        aria-haspopup="dialog"
        aria-controls="dashboard-agent"
        title="Open the RoomSketch AI agent"
        className="fixed right-5 bottom-5 z-40 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral-700"
        onClick={() => setOpen(true)}
      >
        AI agent
      </button>
      <dialog
        id="dashboard-agent"
        ref={dialog}
        aria-labelledby="dashboard-agent-title"
        className="fixed inset-auto right-3 bottom-20 m-0 max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/10 sm:right-5"
        onClose={() => {
          setOpen(false);
          launcher.current?.focus();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="dashboard-agent-title" className="font-semibold">RoomSketch AI agent</h2>
          <button type="button" className="rounded px-2 py-1 text-sm hover:bg-neutral-100" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        {callbackStatus === "failed" && (
          <p role="alert" className="mt-3 text-sm text-red-700">ChatGPT connection failed. Try connecting again.</p>
        )}
        <p className="mt-4 text-sm text-neutral-600">
          {connected
            ? "Your ChatGPT account is connected. Chat requires RoomSketch access to ChatGPT plan usage."
            : "Connect your ChatGPT account to RoomSketch. Chat and workspace edits require access to ChatGPT plan usage."}
        </p>
        {configured ? (
          <a href="/api/chatgpt/connect" className="mt-4 inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            {connected ? "Reconnect ChatGPT" : "Continue with ChatGPT"}
          </a>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">ChatGPT connection is currently unavailable.</p>
        )}
      </dialog>
    </>
  );
}
