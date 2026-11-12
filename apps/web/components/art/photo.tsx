/**
 * A house photograph filling its positioned parent. Decorative (alt=""): the
 * words beside it carry the meaning. Plain <img> with srcset — the files are
 * already graded and sized, so next/image would add nothing but a loader.
 */
import { cn } from "@tycoonhood/ui";
import { PILLAR_PHOTO, photo, type PhotoName } from "../../lib/photos";

export function Photo({
  name,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority,
  className,
}: {
  name: PhotoName;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const p = photo(name);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-graded, pre-sized local files with srcset
    <img
      src={p.src}
      srcSet={p.srcSet}
      sizes={sizes}
      alt=""
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

/**
 * A program's picture, filling its positioned parent: the admin's cover photo
 * when one is set, otherwise the house photograph for the program's pillar.
 */
export function CoverFill({
  pillar,
  coverImage,
  sizes,
  className,
}: {
  pillar: keyof typeof PILLAR_PHOTO;
  coverImage?: string | null;
  sizes?: string;
  className?: string;
}) {
  return coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host; next/image would need every host allow-listed
    <img src={coverImage} alt="" loading="lazy" decoding="async" className={cn("absolute inset-0 h-full w-full object-cover", className)} />
  ) : (
    <Photo name={PILLAR_PHOTO[pillar]} sizes={sizes} className={className} />
  );
}
