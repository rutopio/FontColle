import type { Icon } from "@phosphor-icons/react";
import {
  DownloadSimpleIcon,
  GoogleLogoIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { releasesUrl, repoHostIcon } from "@/components/repo-host-icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { FontRecord } from "@/lib/fonts/types";
import { FAB_MOTION, FAB_SHIFT, fabBottom, fabLift } from "./fab-motion";

// Mobile-only (<768px) access to the family's outbound links. The detail
// header's Google Fonts / Download / Repo buttons don't fit beside the title on
// a phone, so there they're hidden and reached through this FAB instead, which
// opens a bottom drawer holding the same three links. Hidden on desktop via
// md:hidden, where the header buttons show as normal.
//
// This FAB holds the lower slot on every tab so it never moves as the user
// switches tabs; ControlsDrawer stacks above it on the tabs that have controls.
// `dockVisible` drops the whole stack when the preview dock slides away.
export function LinksDrawer({
  font,
  dockVisible,
}: {
  font: FontRecord;
  dockVisible: boolean;
}) {
  const [open, setOpen] = useState(false);
  const RepoIcon = repoHostIcon(font.repositoryUrl);
  const releasesHref = releasesUrl(font.repositoryUrl);
  const googleHref = `https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Same right-4 column and z-40 (below the Sheet's z-50 overlay) as the
          Filter FAB. safe-area padding clears the iOS home indicator. */}
      <motion.button
        {...FAB_MOTION}
        animate={{ ...FAB_MOTION.animate, ...fabLift(dockVisible) }}
        transition={{ ...FAB_MOTION.transition, y: FAB_SHIFT }}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Links for ${font.name}`}
        style={{ bottom: fabBottom(0) }}
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring md:hidden"
      >
        <LinkIcon className="size-6" weight="bold" />
      </motion.button>

      <SheetContent side="bottom" className="gap-0 p-0">
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <LinkIcon className="size-4 text-primary" weight="bold" />
          {/* Also satisfies the dialog's required accessible name. */}
          <SheetTitle>Links</SheetTitle>
        </div>
        {/* Big tappable cards side by side, mirroring the Weight/Width filter
            grids (CardButton): icon above label, equal widths. flex-1 rather
            than a fixed 3-column grid so a family with no repo (or one on a
            host with no releases page) gets wider cards instead of empty
            tracks. */}
        <div
          className="flex gap-3 p-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <LinkCard
            href={googleHref}
            icon={GoogleLogoIcon}
            label="Google Fonts"
            aria-label={`View ${font.name} on Google Fonts`}
            onNavigate={() => setOpen(false)}
          />
          {releasesHref && (
            <LinkCard
              href={releasesHref}
              icon={DownloadSimpleIcon}
              label="Download"
              aria-label={`Download ${font.name} from its repository releases`}
              onNavigate={() => setOpen(false)}
            />
          )}
          {font.repositoryUrl && (
            <LinkCard
              href={font.repositoryUrl}
              icon={RepoIcon}
              label="Repo"
              aria-label={`View ${font.name}'s source repository`}
              onNavigate={() => setOpen(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// One outbound link as a large card. Visually the filter grids' CardButton
// (bordered, centred, icon over label, same press/focus treatment), but a real
// <a>: these navigate rather than toggle, so no button element and no
// aria-pressed. The label is visible text, so it needs no aria-label of its
// own, the passed one adds the family name for screen readers.
function LinkCard({
  href,
  icon: CardIcon,
  label,
  "aria-label": ariaLabel,
  onNavigate,
}: {
  href: string;
  icon: Icon;
  label: string;
  "aria-label": string;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      onClick={onNavigate}
      className="flex flex-1 basis-0 cursor-pointer flex-col items-center gap-2 rounded-md border border-input p-3 text-center shadow-xs outline-none transition-[color,box-shadow,border-color,background-color,transform] hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]"
    >
      <CardIcon className="size-6 text-foreground" />
      <span className="w-full truncate font-medium text-muted-foreground text-xs leading-none">
        {label}
      </span>
    </a>
  );
}
