"use client";

import React from "react";

interface ActionLoaderProps {
  isVisible: boolean;
  text?: string;
}

const segmentIndexes = Array.from({ length: 12 }, (_, index) => index);

const ActionLoader: React.FC<ActionLoaderProps> = ({
  isVisible,
  text = "Saving geofence...",
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <div className="rounded-2xl dark:bg-gray-900 shadow-xl px-8 py-6 flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          {segmentIndexes.map((index) => (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 w-1.5 h-4 -ml-[3px] -mt-8 rounded-full bg-gray-300 dark:bg-gray-600 geofence-loader-segment"
              style={{
                transform: `rotate(${index * 30}deg) translateY(-20px)`,
                animationDelay: `${index * 0.08}s`,
              }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {text}
        </p>
      </div>

      <style jsx>{`
        .geofence-loader-segment {
          transform-origin: center 32px;
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
