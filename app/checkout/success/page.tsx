// PATH: app/checkout/success/page.tsx
import Link from "next/link";

type SearchParams = {
    subscription_id?: string;
    status?: string;
    email?: string;
};

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const { subscription_id, status, email } = await searchParams;
    const isActive = status === "active";

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-6">
            <div
                className="max-w-md w-full rounded-[24px] p-8 text-center"
                style={{
                    background: "#EAEAEA",
                    boxShadow: "-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 16px rgba(0,0,0,0.14)",
                    fontFamily: "'Quicksand','Nunito',sans-serif",
                }}
            >
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{
                        background: "#F5F5F5",
                        color: isActive ? "#3D9A5C" : "#C0392B",
                        boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 12px rgba(0,0,0,0.14)",
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        {isActive ? (
                            <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ) : (
                            <>
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </>
                        )}
                    </svg>
                </div>

                <h1 className="text-[1.5rem] mb-2" style={{ color: "#1A1A1A", fontWeight: 500 }}>
                    {isActive ? "You're on Pro" : "Checkout status: " + (status ?? "unknown")}
                </h1>

                <p className="text-[13.5px] leading-[1.7] mb-6" style={{ color: "#666" }}>
                    {isActive
                        ? "Your subscription is active. Unlimited access to 3D export, custom GLB import, and the full material library is live on your account."
                        : "We couldn't confirm your subscription is active yet. If you completed payment, this should update shortly — check your dashboard in a minute."}
                </p>

                {(email || subscription_id) && (
                    <div
                        className="rounded-[16px] p-4 mb-6 text-left text-[12px]"
                        style={{
                            background: "#F5F5F5",
                            boxShadow: "inset -3px -3px 7px rgba(255,255,255,0.6), inset 3px 3px 8px rgba(0,0,0,0.10)",
                        }}
                    >
                        {email && (
                            <div className="flex justify-between py-1" style={{ color: "#666" }}>
                                <span>Account</span>
                                <span style={{ color: "#1A1A1A" }}>{decodeURIComponent(email)}</span>
                            </div>
                        )}
                        {subscription_id && (
                            <div className="flex justify-between py-1" style={{ color: "#666" }}>
                                <span>Subscription</span>
                                <span style={{ color: "#1A1A1A", fontFamily: "monospace" }}>{subscription_id}</span>
                            </div>
                        )}
                    </div>
                )}

                <Link
                    href="/dashboard"
                    className="inline-block w-full py-[12px] rounded-[16px] text-[13.5px]"
                    style={{
                        fontWeight: 500,
                        color: "#1A1A1A",
                        background: "#F5F5F5",
                        boxShadow: "-5px -5px 10px rgba(255,255,255,0.8), 5px 5px 12px rgba(0,0,0,0.14)",
                    }}
                >
                    Go to dashboard
                </Link>
            </div>
        </div>
    );
}