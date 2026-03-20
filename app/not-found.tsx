"use client";

import React from "react";
import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Number with Animation */}
        <div className="relative">
          <h1 className="text-9xl md:text-[12rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 animate-pulse">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30">
            <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Oops! The page you're looking for seems to have wandered off into
            the digital wilderness.
          </p>
        </div>

        {/* Illustration or Icon */}
        <div className="flex justify-center py-8">
          <div className="relative w-48 h-48">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-full w-full h-full flex items-center justify-center shadow-xl border-4 border-purple-200 dark:border-purple-700">
              <Search className="w-24 h-24 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
        </div>

        {/* Error Code */}
        <div className="pt-4">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">
            ERROR CODE: 404 | PAGE_NOT_FOUND
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
