"use client";

import { useEffect, useRef, useState } from "react";

import { AUTH, ERRORS } from "@/constants/content";

type Props = {
  open: boolean;
  onClose: () => void;
};

type GoogleButtonConfig = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    ux_mode?: "popup" | "redirect";
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
};

type GoogleAccounts = {
  accounts: {
    id: GoogleAccountsId;
  };
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function generateNonce(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  } catch {
    return String(Math.random()).slice(2);
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  const existing = document.getElementById("google-identity") as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => {
        existing.dataset.loaded = "true";
        resolve();
      });
      existing.addEventListener("error", () => reject(new Error("google_identity_script_failed")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-identity";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("google_identity_script_failed")));
    document.head.appendChild(script);
  });
}

export default function AuthDialog({ open, onClose }: Props) {
  const [error, setError] = useState<string>("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleNonceRef = useRef<string>("");

  useEffect(() => {
    if (!open) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
    if (!clientId) return;

    let cancelled = false;
    const host = googleButtonRef.current;

    async function setup() {
      try {
        await loadGoogleIdentityScript();
        if (cancelled) return;

        if (!host) return;

        const google = (window as unknown as { google?: GoogleAccounts }).google;
        if (!google?.accounts?.id) {
          return;
        }

        const nonce = generateNonce();
        googleNonceRef.current = nonce;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          callback: async (response) => {
            const token = response.credential;
            if (!token) return;

            setError("");
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: token }),
              });

              const body = (await res.json()) as { error?: string };
              if (!res.ok) {
                setError(body.error ?? ERRORS.unauthorized);
                return;
              }

              onClose();
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              setError(message || ERRORS.unauthorized);
            }
          },
        });

        host.innerHTML = "";
        google.accounts.id.renderButton(host, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 380,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      }
    }

    void setup();
    return () => {
      cancelled = true;
      if (host) host.innerHTML = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ra-modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={AUTH.loginRequiredTitle}
      onClick={onClose}
    >
      <div className="ra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-modalTitle">{AUTH.loginRequiredTitle}</div>
        <div className="ra-modalBody">{AUTH.loginRequiredBody}</div>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
          <div style={{ marginTop: 14 }}>
            <div ref={googleButtonRef} />
          </div>
        ) : null}

        {error ? <div className="ra-inlineError">{error}</div> : null}

        <button
          type="button"
          className="ra-button ra-buttonGhost"
          style={{ marginTop: 14 }}
          onClick={onClose}
        >
          {AUTH.close}
        </button>

      </div>
    </div>
  );
}
