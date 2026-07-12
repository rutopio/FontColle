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
