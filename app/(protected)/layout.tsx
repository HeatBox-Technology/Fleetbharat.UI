"use client";

import React from "react";
import DualHeaderLayout from "@/components/DualHeaderLayout";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoggedIn) {
      router.push("/"); // redirect to login if user not authenticated
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  return (
    <>
      <DualHeaderLayout>{children}</DualHeaderLayout>
      <ThemeCustomizer />
    </>
  );
}
