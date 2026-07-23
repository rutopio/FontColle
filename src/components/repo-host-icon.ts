import {
  CircleIcon,
  GithubLogoIcon,
  GitlabLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
import { repoHost } from "@/lib/fonts/filter/facets";

// The icon for a family's upstream repo, by host: GitLab and SourceHut get
// their own marks; everything else (GitHub, or an unrecognized host) keeps the
// GitHub logo. SourceHut has no Phosphor logo, so it borrows a plain circle
// (mirroring the "○" in sr.ht's own wordmark). Card and row share this.
export function repoHostIcon(url: string | null): Icon {
  switch (repoHost(url)) {
    case "gitlab":
      return GitlabLogoIcon;
    case "sourcehut":
      return CircleIcon;
    default:
      return GithubLogoIcon;
  }
}

// The repo's releases page, or null when the host has none. "<repo>/releases"
// is a GitHub path convention, not a universal one: GitLab namespaces it under
// "/-/releases" (the bare path redirects to a sign-in page), and SourceHut has
// no releases page at all. Callers render the Download link only when this
// returns a URL, so a family on a host without releases drops the link rather
// than pointing at a 403.
export function releasesUrl(url: string | null): string | null {
  if (!url) return null;
  const base = url.replace(/\/$/, "");
  switch (repoHost(url)) {
    case "gitlab":
      return `${base}/-/releases`;
    case "sourcehut":
      return null;
    default:
      return `${base}/releases`;
  }
}
