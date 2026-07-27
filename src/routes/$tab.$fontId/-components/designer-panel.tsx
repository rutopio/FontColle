import { ArrowUpRightIcon, FunnelIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DesignerSibling } from "@/lib/fonts/detail";
import { emptyFilter, filterToSearch } from "@/lib/fonts/filter/state";
import { fontSlug } from "@/lib/fonts/slug";
import type { FontRecord } from "@/lib/fonts/types";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { AboutPanel } from "./about-panel";
import { Panel } from "./panel";

export function DesignerPanel({
  font,
  siblingsByDesigner,
}: {
  font: FontRecord;
  siblingsByDesigner: Record<string, DesignerSibling[]>;
}) {
  // One string in the record, but Google Fonts credits several, comma-joined.
  const designers = (font.designer ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  // The metadata endpoint keys profiles by name, so match on the trimmed one.
  const profileByName = new Map(
    (font.designerProfiles ?? [])
      .filter((p) => p.name)
      .map((p) => [p.name?.trim() ?? "", p])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* LEFT, one block per credited designer: bio + their other families. */}
      <Panel
        label={designers.length > 1 ? "Designers" : "Designer"}
        count={designers.length || undefined}
      >
        {designers.length > 0 ? (
          <div className="flex flex-col gap-4">
            {designers.map((name, index) => {
              const profile = profileByName.get(name);
              const bio = sanitizeHtml(profile?.bio);
              const siblings = siblingsByDesigner[name] ?? [];
              return (
                <Fragment key={name}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2.5">
                        <Avatar>
                          {profile?.imageUrl && (
                            <AvatarImage
                              src={profile.imageUrl}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Filter the list to just this
                                                    designer: reset every filter,
                                                    then select their capsule. */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          nativeButton={false}
                          role="link"
                          render={
                            <Link
                              to="/"
                              search={filterToSearch({
                                ...emptyFilter,
                                designers: [name],
                              })}
                              aria-label={`Show ${name}'s fonts in the list`}
                            />
                          }
                        >
                          <FunnelIcon />
                          Filter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          nativeButton={false}
                          role="link"
                          render={
                            // biome-ignore lint/a11y/useAnchorContent: Button injects its children into this anchor via the render prop (aria-label also set); the static rule can't see through it.
                            <a
                              href={`https://fonts.google.com/?query=${encodeURIComponent(name)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${name} on Google Fonts`}
                            />
                          }
                        >
                          <ArrowUpRightIcon />
                          Google Fonts
                        </Button>
                      </div>
                    </div>
                    {bio && (
                      <div
                        className="text-primary text-sm leading-relaxed [&_a]:underline"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized to an allowlist in sanitizeHtml.
                        dangerouslySetInnerHTML={{ __html: bio }}
                      />
                    )}
                    {siblings.length > 0 && (
                      <div className="mt-8">
                        <p className="mb-1 text-muted-foreground text-xs">
                          More by {name} ({siblings.length})
                        </p>
                        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-muted-foreground">
                          {siblings.map((s) => (
                            <li key={s.id}>
                              <Link
                                to="/$tab/$fontId"
                                params={{
                                  tab: "instances",
                                  fontId: fontSlug(s.id),
                                }}
                                className="truncate py-0.5 text-sm hover:text-foreground"
                                style={{
                                  fontFamily: `"${s.name}", sans-serif`,
                                }}
                              >
                                {s.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {index < designers.length - 1 && <Separator />}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-muted-foreground text-sm">
            No designer credited.
          </p>
        )}
      </Panel>

      {/* RIGHT, the family "about" prose. */}
      <AboutPanel font={font} />
    </div>
  );
}

// First and last words, so "Erik Spiekermann" -> "ES".
function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
