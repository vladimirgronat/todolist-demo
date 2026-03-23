"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation, declineInvitation } from "@/app/actions/teams";
import type { EnvironmentMember } from "@/types/environment";

interface PendingInvitationsProps {
  invitations: { invitation: EnvironmentMember; environmentName: string }[];
}

export const PendingInvitations = ({ invitations }: PendingInvitationsProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (invitations.length === 0) return null;

  const handleAccept = async (invitationId: string) => {
    setError(null);
    setLoading(invitationId + "-accept");

    const formData = new FormData();
    formData.set("invitation_id", invitationId);
    const result = await acceptInvitation(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(null);
  };

  const handleDecline = async (invitationId: string) => {
    setError(null);
    setLoading(invitationId + "-decline");

    const formData = new FormData();
    formData.set("invitation_id", invitationId);
    const result = await declineInvitation(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(null);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <h2 className="mb-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
        Pending Invitations
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {invitations.map(({ invitation, environmentName }) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-900/40"
          >
            <p className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
              Invited to <span className="font-medium">{environmentName}</span>
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={loading !== null}
                className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {loading === invitation.id + "-accept" ? "…" : "Accept"}
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={loading !== null}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {loading === invitation.id + "-decline" ? "…" : "Decline"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
