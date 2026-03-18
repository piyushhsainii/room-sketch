"use client";

import { VIEWER } from "@/constants/content";

type Props = {
  renderUrl: string;
  videoUrl: string;
};

function DownloadIcon() {
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
        d="M12 3v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 10.5 12 13.9l3.5-3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function VideoPlayer({ renderUrl, videoUrl }: Props) {
  return (
    <div>
      <div className="ra-videoLabel">{VIEWER.cinematicVideo}</div>
      <video className="ra-video" src={videoUrl} poster={renderUrl} controls playsInline />
      <div className="ra-actionRow">
        <a className="ra-ghostBtn" href={videoUrl} download>
          <DownloadIcon />
          {VIEWER.downloadVideo}
        </a>
      </div>
    </div>
  );
}
