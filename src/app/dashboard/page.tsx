"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getFirstAccessibleRoute } from "@/lib/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(getFirstAccessibleRoute(user));
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-faro-text">
        Cargando...
      </div>
    );
  }

  return null;
}
