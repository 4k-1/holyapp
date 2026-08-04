import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteAccount } from "@/features/auth/api/authApi";

export function DeleteAccountPanel() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate("/login");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink/85">
        This permanently removes your parishioner profile, requests, and wallet. Pending certificate requests will be
        cancelled and issued certificates already in your wallet will no longer be accessible through the portal.
        This cannot be undone.
      </p>

      {!confirming ? (
        <div className="mt-4">
          <Button
            className="bg-danger text-white hover:opacity-90"
            onClick={() => setConfirming(true)}
          >
            Delete My Account
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="Type DELETE to confirm"
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="flex gap-2.5">
            <Button
              className="bg-danger text-white hover:opacity-90"
              disabled={confirmText !== "DELETE" || deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
            <Button variant="ghost" onClick={() => { setConfirming(false); setConfirmText(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}