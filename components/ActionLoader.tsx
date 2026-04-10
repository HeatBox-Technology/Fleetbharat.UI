"use client";

import React from "react";
import { useColor } from "@/context/ColorContext";

interface ActionLoaderProps {
  isVisible: boolean;
  text?: string;
}

const segmentIndexes = Array.from({ length: 12 }, (_, index) => index);

const ActionLoader: React.FC<ActionLoaderProps> = ({
  isVisible,
  text = "Processing...",
}) => {
  const { selectedColor } = useColor();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-transparent">
      <div
        className="vts-simple-spinner"
        style={{ borderTopColor: selectedColor }}
        aria-label={text}
      />

      <style jsx>{`
        .vts-simple-spinner {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          border: 3px solid rgba(0, 0, 0, 0.12);
          animation: vts-spin 0.8s linear infinite;
        }
        :global(.dark) .vts-simple-spinner {
          border-color: rgba(255, 255, 255, 0.18);
        }
        @keyframes vts-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ActionLoader;
