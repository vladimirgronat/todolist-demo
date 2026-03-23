export const AppVersionFooter = () => {
  const versionLabel = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
  const commitDate = process.env.NEXT_PUBLIC_COMMIT_DATE;

  const formattedDate = commitDate
    ? new Date(commitDate).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <footer className="mx-auto w-full max-w-2xl px-4 pb-6 pt-3 text-center text-xs text-gray-500">
      Version {versionLabel}{formattedDate ? ` · ${formattedDate}` : ""}
    </footer>
  );
};
