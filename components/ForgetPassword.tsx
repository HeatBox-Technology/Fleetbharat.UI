"use client";

import React, { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "@/services/authService";
import { toast } from "react-toastify";

interface ForgetPasswordProps {
  onBackToLogin: () => void;
}

export const ForgetPassword: React.FC<ForgetPasswordProps> = ({
  onBackToLogin,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email or mobile");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      const response = await forgotPassword(email);

      if (response?.success) {
        toast.success("Reset link sent successfully! Check your email.");
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        toast.error(response?.Message || "Failed to send reset link");
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);

      if (err?.response?.data) {
        toast.error(err.response.data.Message || "Failed to send reset link");
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] px-4 sm:px-6 md:px-0 space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          Forgot Your Password?
        </h2>
        <p className="text-sm sm:text-base text-zinc-500">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Email Field */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-zinc-700">
            Email or Mobile
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendResetLink()}
              className="flex h-10 sm:h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 pl-9 sm:pl-10 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-purple-600 focus:border-purple-600 focus:outline-none"
              placeholder="Enter your registered email or mobile"
            />
          </div>
        </div>

        {/* Send Reset Link Button */}
        <button
          onClick={handleSendResetLink}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md text-sm sm:text-base font-semibold w-full h-10 sm:h-11 bg-purple-600 text-white shadow-md hover:bg-purple-700 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {/* Back to Login */}
        <button
          onClick={onBackToLogin}
          className="flex items-center justify-center gap-2 w-full text-sm sm:text-base font-medium text-purple-600 hover:text-purple-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>
      </div>
    </div>
  );
};
