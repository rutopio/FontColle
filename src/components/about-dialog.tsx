import { CloverIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAbout } from "@/lib/about/context";
import { SITE_NAME } from "@/lib/site";

const REPO_URL = "https://github.com/rutopio/FontColle";
const AUTHOR_URL = "https://chingru.com";
const SPONSOR_URL = "https://buymeacoffee.com/chingru";

const TAGLINE =
  "FontColle is an enhanced Google Fonts collection that filters by what type actually does: OpenType features, variable axes, weight and width steps, writing systems, and color vs. monochrome.";

// The lockup alone: mark and wordmark. Title is passed in rather than imported,
// because the Dialog and Sheet shells each need their own primitive for the
// popup to be labelled correctly.
function AboutHeading({
  Title,
}: {
  Title: typeof DialogTitle | typeof SheetTitle;
}) {
  return (
    // Mark and wordmark side by side, matching BrandMark's proportions (the
    // standalone NotFound/ErrorState lockup). Not BrandMark itself: that one
    // is a <Link to="/">, which would navigate the page out from under the
    // popup, and the name here has to be the shell's own Title primitive for
    // the popup to be labelled. translate-y-1 optically seats the wordmark
    // against the mark, as it does there.
    <div className="flex flex-wrap items-center justify-center gap-2 text-primary">
      <LogoIcon className="size-8" />
      <Title className="translate-y-1 font-mono text-xl tracking-tight">
        {SITE_NAME}
      </Title>
    </div>
  );
}

// Everything below the lockup: identical in both presentations. The tagline
// stays the shell's Description primitive even though it now reads as body
// copy, so the popup keeps its accessible description.
function AboutBody({
  Description,
}: {
  Description: typeof DialogDescription | typeof SheetDescription;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 text-center text-muted-foreground text-sm leading-relaxed">
        <Description className="text-balance">{TAGLINE}</Description>
        <p className="text-balance">
          The fonts keep their own licenses, mostly the SIL Open Font License;
          each family's terms are on its License tab.
        </p>
        <p className="text-balance">
          {SITE_NAME} itself is open source under the MIT license.
        </p>
        <p>
          Made by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            ChingRu (@rutopio)
          </a>
        </p>
      </div>

      {/* Two equal columns. The repo sits on the right and keeps the solid
          variant as the primary destination; supporting is the optional one, so
          they differ by variant rather than by size. */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          nativeButton={false}
          role="link"
          variant="outline"
          className="w-full"
          render={
            // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
            <a
              href={SPONSOR_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={`Support ${SITE_NAME} on Buy Me a Coffee`}
            />
          }
        >
          <CloverIcon />
          Support
        </Button>
        <Button
          nativeButton={false}
          role="link"
          className="w-full"
          render={
            // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${SITE_NAME} on GitHub`}
            />
          }
        >
          <GithubLogoIcon />
          GitHub
        </Button>
      </div>
    </>
  );
}

// About is a popup rather than a page: it holds a few paragraphs, and keeping
// the page underneath mounted means the icon rail stays exactly as it was on
// whichever view opened it. Mounted once in __root; opened from AboutLink in the
// icon rail's footer and the mobile top bar.
//
// Same content, two shells: a centered dialog on desktop, a bottom sheet on
// touch, where a centered box is an awkward place to reach. This mirrors the
// list's SortControl, which swaps a dropdown for a sheet at the same breakpoint.
export function AboutDialog() {
  const { open, setOpen } = useAbout();
  const mobile = useIsMobile();

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="gap-4 px-4 pt-6"
          // Clear of the home indicator on gesture-nav phones, matching the
          // sort sheet.
          style={{
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <SheetHeader className="items-center gap-2 p-0 text-center">
            <AboutHeading Title={SheetTitle} />
          </SheetHeader>
          <AboutBody Description={SheetDescription} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-8 sm:max-w-md">
        <DialogHeader className="items-center pt-4 text-center">
          <AboutHeading Title={DialogTitle} />
        </DialogHeader>
        <AboutBody Description={DialogDescription} />
      </DialogContent>
    </Dialog>
  );
}
