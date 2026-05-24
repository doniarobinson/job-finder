const GITHUB_REPO_URL = "https://github.com/doniarobinson/job-finder";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-4 text-sm text-muted">
        Code available at:{" "}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:underline"
        >
          github.com/doniarobinson/job-finder
        </a>
      </div>
    </footer>
  );
}
