// src/features/auth/authService.js
import api from "./apiService";

export const loginUser = async (identifier, password) => {
  const trimmedIdentifier = String(identifier || "").trim();
  const payload = {
    email: trimmedIdentifier,
    password,
  };

  try {
    const res = await api.post("/api/auth/login", payload);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "Login failed. Please try again.",
        data: null,
      }
    );
  }
};

export const requestLoginOtp = async (phone) => {
  const trimmedPhone = String(phone || "").trim();
  try {
    const res = await api.post("/api/auth/request-login-otp", {
      phone: trimmedPhone,
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message ||
          "Failed to send OTP. Please try again.",
        data: null,
      }
    );
  }
};

export const verifyLoginOtp = async (userId, otp) => {
  try {
    const res = await api.post("/api/auth/verify-login-otp", { userId, otp });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message: error.response?.data?.message || "OTP verification failed",
        data: null,
      }
    );
  }
};

export const verify2FA = async (userId, code) => {
  try {
    const res = await api.post("/api/auth/verify-2fa", { userId, code });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message || "OTP verification failed",
        data: null,
      }
    );
  }
};

export const registerUser = async (userData) => {
  try {
    const res = await api.post("/api/auth/signup", userData);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message || "Registration failed. Please try again.",
        data: null,
      }
    );
  }
};

export const forgotPassword = async (email) => {
  try {
    const res = await api.post("/api/auth/forgot-password", { email });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message || "Forgot password request failed.",
        data: null,
      }
    );
  }
};

export const resetPassword = async ({
  email,
  token,
  newPassword,
  confirmPassword,
}) => {
  try {
    const res = await api.post("/api/auth/reset-password", {
      email,
      token,
      newPassword,
      confirmPassword,
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        success: false,
        statusCode: error.response?.status || 500,
        message:
          error.response?.data?.message || "Reset password failed. Please try again.",
        data: null,
      }
    );
  }
};
