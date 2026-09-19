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
    window.addEventListener("holyapp-user-updated", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("holyapp-user-updated", syncFromStorage);
    };
  }, []);

  return user;
}