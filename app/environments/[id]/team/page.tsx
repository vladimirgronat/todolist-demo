import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getEnvironmentMembers, getEnvironmentOwner } from "@/lib/teams";
import { TeamMembers } from "@/components/team-members";

interface TeamPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [members, ownerInfo] = await Promise.all([
    getEnvironmentMembers(id),
    getEnvironmentOwner(id),
  ]);

  if (!ownerInfo) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Environment not found or you don&apos;t have access.
        </p>
        <Link
          href="/environments"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          &larr; Back to Environments
        </Link>
      </main>
    );
  }

  // Fetch environment name for the heading
  const { data: env } = await supabase
    .from("environments")
    .select("name")
    .eq("id", id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/environments"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Environments
          </Link>
          <h1 className="mt-1 text-2xl font-bold dark:text-gray-100">
            Team — {env?.name ?? "Unknown"}
          </h1>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <TeamMembers
          environmentId={id}
          members={members}
          isOwner={ownerInfo.isCurrentUserOwner}
          currentUserId={user.id}
        />
      </div>
    </main>
  );
}
