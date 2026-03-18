"use client";

import { UPLOAD } from "@/constants/content";
import { formatBytes } from "@/lib/format";

type Props = {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  onRemove: () => void;
};

function FileIcon({ type }: { type: string }) {
  const isPdf = type === "application/pdf";
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 3h7l3 3v15H7V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {isPdf ? (
        <path
          d="M8.5 16.5h7"
          stroke="var(--color-danger)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M9 16.5h6"
          stroke="var(--color-accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function CheckDrawIcon({ animate }: { animate: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className={animate ? "ra-checkPath" : undefined}
        d="M20 6 9 17l-5-5"
        stroke="var(--color-success)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FilePreview({ file, uploading, uploaded, onRemove }: Props) {
  const ready = uploaded && !uploading;
  return (
    <div className="ra-filePreview">
      <FileIcon type={file.type} />
      <div className="ra-fileInfo">
        <div className="ra-fileName">{file.name}</div>
        <div className="ra-fileMeta">
          <span>{formatBytes(file.size)}</span>
          <button type="button" className="ra-link" onClick={onRemove}>
            {UPLOAD.remove}
          </button>
          {ready ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CheckDrawIcon animate={ready} /> {UPLOAD.ready}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
