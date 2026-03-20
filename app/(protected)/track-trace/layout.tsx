import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  // This layout will use the protected DualHeaderLayout
  return <>{children}</>;
}
