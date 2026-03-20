"use client";

import { LoginComponent } from "@/components/Login";
import { RegisterComponent } from "@/components/Register";
import { ForgetPassword } from "@/components/ForgetPassword";
import { useState } from "react";

type ViewType = "login" | "register" | "forgot-password";

const Auth = () => {
  const [currentView, setCurrentView] = useState<ViewType>("login");

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {/* Card Wrapper */}
      <div className="flex flex-col lg:flex-row w-full max-w-6xl bg-white shadow-2xl rounded-2xl overflow-hidden">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 relative min-h-[600px] bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white">
            <div className="space-y-6 text-center">
              <h1 className="text-4xl font-bold">Super Admin Portal</h1>
              <p className="text-lg text-purple-100">
                Manage, Monitor, and Maintain with Ultimate Control
              </p>
              <div className="grid grid-cols-3 gap-4 mt-12">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-lg bg-white/10 backdrop-blur-sm animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 flex items-start justify-center p-6 lg:p-8">
          <div className="w-full max-w-md">
            {currentView === "login" && (
              <LoginComponent
                onSwitchToRegister={() => setCurrentView("register")}
                onSwitchToForgotPassword={() =>
                  setCurrentView("forgot-password")
                }
              />
            )}
            {currentView === "register" && (
              <RegisterComponent
                onSwitchToLogin={() => setCurrentView("login")}
              />
            )}
            {currentView === "forgot-password" && (
              <ForgetPassword onBackToLogin={() => setCurrentView("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
