"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteMember, removeMember, leaveEnvironment } from "@/app/actions/teams";
import type { EnvironmentMember } from "@/types/environment";

interface TeamMembersProps {
  environmentId: string;
  members: EnvironmentMember[];
  isOwner: boolean;
  currentUserId: string;
}

export const TeamMembers = ({
  environmentId,
  members,
  isOwner,
  currentUserId,
}: TeamMembersProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member from the environment?")) return;
    setError(null);
    setLoading(memberId);

    const formData = new FormData();
    formData.set("environment_id", environmentId);
    formData.set("member_id", memberId);
    const result = await removeMember(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(null);
  };

  const handleLeave = async () => {
    if (!confirm("Leave this environment? You will lose access to its tasks.")) return;
    setError(null);
    setLoading("leave");

    const formData = new FormData();
    formData.set("environment_id", environmentId);
    const result = await leaveEnvironment(formData);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/environments");
      router.refresh();
    }
    setLoading(null);
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading("invite");

    const formData = new FormData(e.currentTarget);
    formData.set("environment_id", environmentId);
    const result = await inviteMember(formData);

    if (result.error) {
      setError(result.error);
    } else {
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setLoading(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isMemberOwner = member.role === "owner";
          const isPending = member.joined_at === null;

          return (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <span
                className="flex-1 truncate font-mono text-gray-700 dark:text-gray-300"
                title={member.user_id}
              >
                {member.user_id.slice(0, 8)}…
                {isCurrentUser && (
                  <span className="ml-1 font-sans text-xs text-gray-400 dark:text-gray-500">
                    (you)
                  </span>
                )}
              </span>

              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isMemberOwner
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {isMemberOwner ? "Owner" : "Member"}
              </span>

              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isPending
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                }`}
              >
                {isPending ? "Pending" : "Joined"}
              </span>

              {isOwner && !isMemberOwner && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={loading === member.id}
                  className="rounded-lg px-2 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label="Remove member"
                >
                  {loading === member.id ? "…" : "Remove"}
                </button>
              )}

              {!isOwner && isCurrentUser && (
                <button
                  onClick={handleLeave}
                  disabled={loading === "leave"}
                  className="rounded-lg px-2 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                  aria-label="Leave environment"
                >
                  {loading === "leave" ? "…" : "Leave"}
                </button>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No members yet.
          </p>
        )}
      </div>

      {isOwner && (
        <form onSubmit={handleInvite} className="flex gap-2">
          <label htmlFor="invite-email" className="sr-only">
            Email address
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="Invite by email…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={loading === "invite"}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === "invite" ? "Inviting…" : "Invite"}
          </button>
        </form>
      )}
    </div>
  );
};
