"use client";

import React from "react";

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
);

export default function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:flex-row">
        <div className="hidden min-h-[600px] lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-500 p-12">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className="h-16 w-16 bg-white/25"
              />
            ))}
          </div>
        </div>
        <div className="flex w-full items-start justify-center p-6 lg:w-1/2 lg:p-8">
          <div className="w-full max-w-md space-y-4">
            <SkeletonBlock className="h-8 w-56" />
            <SkeletonBlock className="h-4 w-72 max-w-full" />
            <SkeletonBlock className="mt-6 h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="h-11 w-full" />
            <SkeletonBlock className="mt-2 h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
