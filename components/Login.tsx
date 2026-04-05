"use client";

import { useColor } from "@/context/ColorContext";
import {
  loginUser,
  requestLoginOtp,
  verify2FA,
  verifyLoginOtp,
} from "@/services/authService";
import { getUserRoleData } from "@/services/commonServie";
import { applyWhiteLabelColors } from "@/utils/themeUtils";
import Cookies from "js-cookie";
import { AtSign, Eye, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

interface LoginComponentProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  otp?: string;
}

type OtpMode = "twofa" | "loginOtp";

const RESEND_SECONDS = 60;

export const LoginComponent: React.FC<LoginComponentProps> = ({
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const {
    selectedColor,
    handleColorChange,
    colorBlock,
    setColorBlock,
    hexToHsl,
  } = useColor();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMode, setOtpMode] = useState<OtpMode | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pending2FAUser, setPending2FAUser] = useState<{
    userId: string;
    email: string;
    fullName: string;
  } | null>(null);
  const [pendingLoginOtp, setPendingLoginOtp] = useState<{
    userId: string;
    phone: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const router = useRouter();

  void selectedColor;
  void colorBlock;
  void setColorBlock;
  void hexToHsl;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isPhoneLike = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/[a-zA-Z]/.test(trimmed)) return false;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15;
  };

  const isPhoneFlow = useMemo(() => isPhoneLike(email), [email]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");

    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!showOtpModal || otpMode !== "loginOtp" || resendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [showOtpModal, otpMode, resendSeconds]);

  const validateIdentifier = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Email, mobile number, or username is required";
    }

    const hasLetters = /[a-zA-Z]/.test(trimmed);
    const digits = trimmed.replace(/\D/g, "");
    const looksPhone = !hasLetters && digits.length > 0;

    if (looksPhone) {
      if (digits.length < 8 || digits.length > 15) {
        return "Please enter a valid phone number";
      }
      return undefined;
    }

    if (trimmed.includes("@") && !emailRegex.test(trimmed)) {
      return "Please enter a valid email address";
    }

    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 6) {
      return "Password must be at least 6 characters";
    }
    return undefined;
  };

  const completeLogin = async (userData: any) => {
    if (!userData?.token?.accessToken) {
      toast.error("Login token not found.");
      return;
    }

    localStorage.setItem("authToken", userData.token.accessToken);
    localStorage.setItem("user", JSON.stringify(userData));
    Cookies.set("authToken", userData.token.accessToken, {
      path: "/",
    });

    if (userData.whiteLabel) {
      const whiteLabel = userData.whiteLabel;
      applyWhiteLabelColors(whiteLabel, handleColorChange);
      localStorage.setItem("whiteLabelTheme", JSON.stringify(whiteLabel));
    }

    if (Array.isArray(userData.formRights)) {
      localStorage.setItem("permissions", JSON.stringify(userData.formRights));
    } else {
      await getUserRoleData();
    }
    window.dispatchEvent(new Event("permissions-updated"));

    toast.success("Login successful!");
    router.push("/dashboard");
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }

    if (isPhoneLike(value)) {
      setPassword("");
      if (errors.password) {
        setErrors((prev) => ({ ...prev, password: undefined }));
      }
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleEmailBlur = () => {
    const error = validateIdentifier(email);
    setErrors((prev) => ({ ...prev, email: error }));
  };

  const handlePasswordBlur = () => {
    if (isPhoneFlow) return;
    const error = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: error }));
  };

  const validateForm = (): boolean => {
    const emailError = validateIdentifier(email);
    const passwordError = isPhoneFlow ? undefined : validatePassword(password);

    setErrors({
      email: emailError,
      password: passwordError,
    });

    return !emailError && !passwordError;
  };

  const handleLoginWithPassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      const response = await loginUser(email, password);
      const token = response?.data?.token;
      if (!token) {
        toast.error(response?.message || "Login failed. Please try again.");
        return;
      }

      if (token.is2FARequired) {
        setPending2FAUser({
          userId: response?.data?.userId,
          email: response?.data?.email || email,
          fullName: response?.data?.fullName || "",
        });
        setPendingLoginOtp(null);
        setOtpMode("twofa");
        setOtpCode("");
        setShowOtpModal(true);
        toast.info("OTP sent to your email. Please verify to continue.");
        return;
      }

      await completeLogin(response.data);
    } catch (err: any) {
      console.error("Login error:", err);

      if (err?.response?.data) {
        toast.error(
          err.response.data.message ||
            err.response.data.Message ||
            "Login failed. Please try again.",
        );
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLoginOtp = async (isResend = false) => {
    const identifierError = validateIdentifier(email);
    if (identifierError) {
      setErrors((prev) => ({ ...prev, email: identifierError }));
      return;
    }

    if (!isPhoneFlow) {
      toast.error("Please enter a valid phone number to receive OTP.");
      return;
    }

    try {
      setOtpRequesting(true);
      setErrors((prev) => ({ ...prev, email: undefined }));

      const response = await requestLoginOtp(email);
      if (!response?.data?.userId) {
        toast.error(response?.message || "Failed to send OTP. Please try again.");
        return;
      }

      setPendingLoginOtp({
        userId: response.data.userId,
        phone: email.trim(),
      });
      setPending2FAUser(null);
      setOtpMode("loginOtp");
      setOtpCode("");
      setShowOtpModal(true);
      setResendSeconds(RESEND_SECONDS);

      toast.info(isResend ? "OTP resent to WhatsApp." : "OTP sent to WhatsApp.");
    } catch (err: any) {
      console.error("Request OTP error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          "Failed to send OTP. Please try again.",
      );
    } finally {
      setOtpRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpMode) {
      toast.error("OTP session missing. Please login again.");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setErrors((prev) => ({ ...prev, otp: "Please enter valid 6 digit OTP" }));
      return;
    }

    try {
      setVerifyingOtp(true);
      setErrors((prev) => ({ ...prev, otp: undefined }));

      if (otpMode === "twofa") {
        if (!pending2FAUser?.userId) {
          toast.error("2FA session missing. Please login again.");
          return;
        }

        const response = await verify2FA(pending2FAUser.userId, otpCode);
        if (!response?.success || !response?.data?.token) {
          toast.error(response?.message || "OTP verification failed");
          return;
        }

        setShowOtpModal(false);
        setPending2FAUser(null);
        setOtpMode(null);
        setOtpCode("");
        await completeLogin(response.data);
        return;
      }

      if (!pendingLoginOtp?.userId) {
        toast.error("OTP session missing. Please login again.");
        return;
      }

      const response = await verifyLoginOtp(pendingLoginOtp.userId, otpCode);
      if (!response?.success || !response?.data?.token) {
        toast.error(response?.message || "OTP verification failed");
        return;
      }

      setShowOtpModal(false);
      setPendingLoginOtp(null);
      setOtpMode(null);
      setOtpCode("");
      await completeLogin(response.data);
    } catch (err: any) {
      console.error("OTP verify error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          "OTP verification failed",
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (isPhoneFlow) {
      await handleRequestLoginOtp();
      return;
    }
    await handleLoginWithPassword();
  };

  const handleCancelOtp = () => {
    setShowOtpModal(false);
    setPending2FAUser(null);
    setPendingLoginOtp(null);
    setOtpMode(null);
    setOtpCode("");
    setResendSeconds(0);
  };

  const otpDestination =
    otpMode === "loginOtp"
      ? pendingLoginOtp?.phone
        ? `WhatsApp (${pendingLoginOtp.phone})`
        : "WhatsApp"
      : pending2FAUser?.email
        ? `(${pending2FAUser.email})`
        : "";

  return (
    <div className="w-full max-w-[400px] px-4 sm:px-6 md:px-0 space-y-6 sm:space-y-8">
      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          Welcome Back
        </h2>
        <p className="text-sm sm:text-base text-zinc-500">
          Enter your credentials to access your account.
        </p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-zinc-700">
              Email, Mobile, or Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <input
                type="text"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                className={`flex h-10 sm:h-11 w-full rounded-md border bg-zinc-50 px-3 py-1 pl-9 sm:pl-10 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-purple-600 focus:border-purple-600 focus:outline-none ${
                  errors.email ? "border-red-500" : "border-zinc-200"
                }`}
                placeholder="you@example.com, 1234567890, or username"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {!isPhoneFlow && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-zinc-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  onKeyDown={(e) => e.key === "Enter" && handleLoginWithPassword()}
                  className={`flex h-10 sm:h-11 w-full rounded-md border bg-zinc-50 px-3 py-1 pl-9 sm:pl-10 pr-10 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-purple-600 focus:border-purple-600 focus:outline-none ${
                    errors.password ? "border-red-500" : "border-zinc-200"
                  }`}
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 -m-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {!isPhoneFlow ? (
            <div className="flex items-center justify-between pt-1 sm:pt-2">
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={`h-4 w-4 rounded border flex items-center justify-center ${
                    rememberMe
                      ? "bg-purple-600 border-purple-600"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  {rememberMe && (
                    <svg
                      className="h-3 w-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <label className="text-xs sm:text-sm font-medium text-zinc-600 select-none">
                  Remember me
                </label>
              </div>
              <button
                onClick={onSwitchToForgotPassword}
                className="text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Forgot password?
              </button>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-zinc-500">
              We will send an OTP to your WhatsApp number.
            </p>
          )}
        </div>

        <button
          onClick={handlePrimaryAction}
          disabled={loading || otpRequesting}
          className="inline-flex items-center justify-center rounded-md text-sm sm:text-base font-semibold w-full h-10 sm:h-11 bg-purple-600 text-white shadow-md hover:bg-purple-700 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {isPhoneFlow
            ? otpRequesting
              ? "Sending OTP..."
              : "Send OTP"
            : loading
              ? "Logging in..."
              : "Login"}
        </button>
      </div>

      <div className="text-center text-xs sm:text-sm text-zinc-500">
        Don't have an account?{" "}
        <button
          onClick={onSwitchToRegister}
          className="font-semibold text-purple-600 hover:underline"
        >
          Sign Up
        </button>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Verify OTP</h3>
            <p className="mt-1 text-sm text-zinc-600">
              6 digit OTP sent to {otpDestination}
            </p>

            <input
              type="text"
              value={otpCode}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(nextValue);
                if (errors.otp) {
                  setErrors((prev) => ({ ...prev, otp: undefined }));
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              placeholder="Enter 6 digit OTP"
              maxLength={6}
              inputMode="numeric"
              className={`mt-4 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600 ${
                errors.otp ? "border-red-500" : "border-zinc-300"
              }`}
            />
            {errors.otp && (
              <p className="mt-1 text-xs text-red-500">{errors.otp}</p>
            )}

            {otpMode === "loginOtp" && (
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {resendSeconds > 0
                    ? `Resend OTP in 00:${String(resendSeconds).padStart(2, "0")}`
                    : "Didn't receive OTP?"}
                </span>
                <button
                  type="button"
                  disabled={resendSeconds > 0 || otpRequesting}
                  onClick={() => handleRequestLoginOtp(true)}
                  className="text-purple-600 font-medium disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelOtp}
                disabled={verifyingOtp}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {verifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
