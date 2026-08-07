// app/share/[token]/page.tsx
import { getShareProject } from "@/components/workspace/lib/getShareProject";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareView from "./shareView";

const DEFAULT_OG_IMAGE = "https://roomsketch.vercel.app/room-sketch-hero.png";
const SITE_NAME = "roomsketch";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const project = await getShareProject(token);

  if (!project) {
    return {
      title: `Link not found · ${SITE_NAME}`,
      description: "This share link is invalid or no longer active.",
    };
  }

  const image = project.thumbnail_url ?? project.render_url ?? DEFAULT_OG_IMAGE;
  const title = `${project.project_name} · Floor Plan · ${SITE_NAME}`;
  const description = project.builder?.full_name
    ? `A floor plan by ${project.builder.full_name}, built with ${SITE_NAME}. View in interactive 2D/3D.`
    : `View this floor plan in interactive 2D/3D, built with ${SITE_NAME}.`;

  return {
    title,
    description,
    keywords: [
      "floor plan",
      "floor plan design",
      "3D floor plan",
      "interior design tool",
      project.project_name,
      SITE_NAME,
    ],
    openGraph: {
      title,
      description,
      type: "website",
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: project.project_name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const project = await getShareProject(token);

  if (!project) notFound();

  return <ShareView token={token} initialData={project} />;
}