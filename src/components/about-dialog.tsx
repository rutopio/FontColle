import { CloverIcon, GithubLogoIcon, HeartIcon } from "@phosphor-icons/react";
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
import {
  ABOUT_DESCRIPTION_REST,
  REPO_URL,
  SITE_NAME,
  SITE_NAME_PRONUNCIATION,
} from "@/lib/site";

const AUTHOR_URL = "https://chingru.com";
const SPONSOR_URL = "https://buymeacoffee.com/chingru";

function AboutHeading({
  Title,
}: {
  Title: typeof DialogTitle | typeof SheetTitle;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-primary">
      <LogoIcon className="size-8" />
      <Title className="font-mono text-xl tracking-tight">{SITE_NAME}</Title>
    </div>
  );
}

function AboutBody({
  Description,
}: {
  Description: typeof DialogDescription | typeof SheetDescription;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 text-center text-foreground text-sm leading-relaxed">
        <Description className="text-balance text-foreground">
          {SITE_NAME}{" "}
          <span className="text-muted-foreground">
            (/{SITE_NAME_PRONUNCIATION}/)
          </span>{" "}
          {ABOUT_DESCRIPTION_REST}
        </Description>
        <p className="text-balance">
          The fonts keep their own licenses, mostly the SIL Open Font License;
          each family's terms are on its License tab.
        </p>
        <p className="text-balance">
          {SITE_NAME} itself is open source under the MIT license.
        </p>
        <p className="mx-auto">
          <HeartIcon weight="fill" />
        </p>
        <p>
          Made by{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            ChingRu
          </a>
        </p>
      </div>

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

export function AboutDialog() {
  const { open, setOpen } = useAbout();
  const mobile = useIsMobile();

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="gap-4 px-4 pt-6"
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
