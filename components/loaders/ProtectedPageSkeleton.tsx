"use client";

import React from "react";

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
);

export default function ProtectedPageSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <SkeletonBlock className="h-10 w-72 max-w-full" />
          <SkeletonBlock className="h-10 w-32" />
        </div>

        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
