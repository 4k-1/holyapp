import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api/authApi";
import type { CurrentUser } from "@/types";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  useEffect(() => {
    function syncFromStorage() {
      setUser(getCurrentUser());
    }
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  return user;
}