"use client";

import { useEffect, useMemo, useState } from "react";

import { VIEWER } from "@/constants/content";
import { formatBytes } from "@/lib/format";
import { getSignedUrl } from "@/lib/supabase";

export type ProjectAssetsProps = {
  projectId: string;
  floorplanUrl: string | null;
  renderUrl: string | null;
  videoUrl: string | null;
  projectName: string;
};

type AssetKind = "floorplan" | "render" | "video";

type Asset = {
  kind: AssetKind;
  label: string;
  url: string;
  filename: string;
  canView: boolean;
};

const VIEW_EVENT = "renderai:view-slide";

function sanitizeFilenameBase(name: string): string {
  const trimmed = name.trim() || "project";
  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80);
}

function parseSupabaseStorage(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);

    const objectIdx = parts.findIndex((p) => p === "object");
    if (objectIdx < 0) return null;

    const maybePublicOrSign = parts[objectIdx + 1];
    const bucket = parts[objectIdx + 2];
    if (!bucket || (maybePublicOrSign !== "public" && maybePublicOrSign !== "sign")) return null;

    const pathParts = parts.slice(objectIdx + 3);
    const path = decodeURIComponent(pathParts.join("/"));
    if (!path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

async function headSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    if (!len) return null;
    const n = Number(len);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 14l2.5-2.5L13 15l2-2 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 9.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 7h11v10H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 10l5-3v10l-5-3v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 3h7l3 3v15H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 13h6M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 10.5 12 13.9l3.5-3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

async function resolveDownloadUrl(url: string): Promise<string> {
  const parsed = parseSupabaseStorage(url);
  if (!parsed) return url;

  try {
    return await getSignedUrl(parsed.bucket, parsed.path);
  } catch {
    return url;
  }
}

async function triggerDownload(sourceUrl: string, filename: string): Promise<void> {
  const url = await resolveDownloadUrl(sourceUrl);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ProjectAssets({
  floorplanUrl,
  renderUrl,
  videoUrl,
  projectName,
}: ProjectAssetsProps) {
  const [sizes, setSizes] = useState<Record<AssetKind, number | null>>({
    floorplan: null,
    render: null,
    video: null,
  });

  const assets = useMemo<Asset[]>(() => {
    const base = sanitizeFilenameBase(projectName);
    const out: Asset[] = [];

    if (floorplanUrl) {
      const isPdf = floorplanUrl.toLowerCase().includes(".pdf");
      out.push({
        kind: "floorplan",
        label: VIEWER.assets.floorplanLabel,
        url: floorplanUrl,
        filename: `${base}-floorplan.${isPdf ? "pdf" : "png"}`,
        canView: !isPdf,
      });
    }
    if (renderUrl) {
      out.push({
        kind: "render",
        label: VIEWER.assets.renderLabel,
        url: renderUrl,
        filename: `${base}-render.png`,
        canView: true,
      });
    }
    if (videoUrl) {
      out.push({
        kind: "video",
        label: VIEWER.assets.videoLabel,
        url: videoUrl,
        filename: `${base}-video.mp4`,
        canView: false,
      });
    }
    return out;
  }, [floorplanUrl, projectName, renderUrl, videoUrl]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const next: Record<AssetKind, number | null> = { floorplan: null, render: null, video: null };
      for (const asset of assets) {
        const n = await headSize(asset.url);
        next[asset.kind] = n;
      }
      if (!cancelled) setSizes(next);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [assets]);

  if (assets.length === 0) return null;

  return (
    <div className="ra-assets">
      <div className="ra-assetsLabel">{VIEWER.assets.sectionLabel}</div>

      {assets.map((asset) => {
        const size = sizes[asset.kind];
        const icon =
          asset.kind === "video" ? <VideoIcon /> : asset.url.toLowerCase().includes(".pdf") ? <DocIcon /> : <ImageIcon />;

        return (
          <div key={asset.kind} className="ra-assetRow">
            <div className="ra-assetLeft">
              <div className="ra-assetIcon">{icon}</div>
              <div className="ra-assetName">{asset.label}</div>
              {typeof size === "number" ? (
                <div className="ra-assetSize">{formatBytes(size)}</div>
              ) : null}
            </div>

            <div className="ra-assetRight">
              {asset.canView ? (
                <button
                  type="button"
                  className="ra-assetBtn"
                  onClick={() => {
                    const index = asset.kind === "floorplan" ? 0 : 1;
                    window.dispatchEvent(new CustomEvent(VIEW_EVENT, { detail: { index } }));
                  }}
                >
                  <EyeIcon />
                  {VIEWER.assets.viewButton}
                </button>
              ) : null}

              <button
                type="button"
                className="ra-assetBtn"
                onClick={() => triggerDownload(asset.url, asset.filename)}
              >
                <DownloadIcon />
                {VIEWER.assets.downloadButton}
              </button>
            </div>
          </div>
        );
      })}

      {assets.length > 1 ? (
        <div className="ra-assetsFooter">
          <button
            type="button"
            className="ra-assetBtn"
            onClick={async () => {
              for (let i = 0; i < assets.length; i += 1) {
                await triggerDownload(assets[i].url, assets[i].filename);
                if (i < assets.length - 1) {
                  await new Promise((r) => setTimeout(r, 300));
                }
              }
            }}
          >
            <DownloadIcon />
            {VIEWER.assets.downloadAll}
          </button>
        </div>
      ) : null}
    </div>
  );
}
