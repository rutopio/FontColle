import {
  CircleIcon,
  GithubLogoIcon,
  GitlabLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
import { repoHost } from "@/lib/fonts/filter/facets";

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

// GitLab uses "/-/releases"; SourceHut has no releases page.
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
