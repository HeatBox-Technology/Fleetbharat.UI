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
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <div
        className="rounded-2xl px-8 py-6 flex flex-col items-center gap-4 "
        style={{ borderColor: `${selectedColor}33` }}
      >
        <div className="relative w-16 h-16 flex items-center justify-center">
          {segmentIndexes.map((index) => (
            <span
              key={index}
              className="absolute w-1.5 h-4 rounded-full geofence-loader-segment"
              style={{
                transform: `rotate(${index * 30}deg) translateY(-20px)`,
                animationDelay: `${index * 0.08}s`,
                backgroundColor: selectedColor,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .geofence-loader-segment {
          transform-origin: center 20px;
          animation: geofence-spin-fade 1s linear infinite;
        }

        @keyframes geofence-spin-fade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
};

export default ActionLoader;