// app/community/page.tsx  (SERVER component — no "use client")
import CommunityPageClient from "@/components/community/CommunityPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Community Floor Plans | RoomSketch",
    description: "Browse public floor plans created by the RoomSketch community — ranked by stars, viewable in read-only 3D.",
    openGraph: {
        title: "Community Floor Plans | RoomSketch",
        description: "Browse public floor plans created by the RoomSketch community.",
        images: ["/og-community.png"], // add this asset — 1200x630, branded
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Community Floor Plans | RoomSketch",
        description: "Browse public floor plans created by the RoomSketch community.",
        images: ["/og-community.png"],
    },
};

export default function CommunityPage() {
    return <CommunityPageClient />;
}