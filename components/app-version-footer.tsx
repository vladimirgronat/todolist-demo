export const AppVersionFooter = () => {
  const versionLabel = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

  return (
    <footer className="mx-auto w-full max-w-2xl px-4 pb-6 pt-3 text-center text-xs text-gray-500">
      Version {versionLabel}
    </footer>
  );
};
