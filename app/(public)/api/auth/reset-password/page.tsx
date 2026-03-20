"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { resetPassword } from "@/services/authService";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    setToken(params.get("token") || "");
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) return toast.error("Email is required");
    if (!token.trim()) return toast.error("Token is required");
    if (!newPassword.trim()) return toast.error("New password is required");
    if (!confirmPassword.trim())
      return toast.error("Confirm password is required");
    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirm password must match");
    }

    try {
      setLoading(true);
      const response = await resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      if (response?.success) {
        toast.success(response?.Message || "Password reset successful");
        setTimeout(() => router.push("/"), 1200);
      } else {
        toast.error(response?.Message || "Failed to reset password");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.Message || "Network error. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">Reset Password</h1>
          <p className="text-sm text-zinc-500">
            Enter your new password to continue.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm focus:border-purple-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-600"
              placeholder="Enter email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm focus:border-purple-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-600"
              placeholder="Enter token"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm focus:border-purple-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-600"
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
              className="h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm focus:border-purple-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-600"
              placeholder="Confirm password"
            />
          </div>

          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-purple-600 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
