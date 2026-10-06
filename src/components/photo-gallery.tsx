"use client";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/components/ui/button";
export function PhotoGallery({
  images,
}: {
  images: { url: string; thumbUrl: string; alt: string }[];
}) {
  const [selected, setSelected] = useState(0);
  const t = useTranslations("Listing");
  if (!images.length)
    return (
      <div className="card flex aspect-[4/3] items-center justify-center bg-sky text-primary/40">
        <ImageOff size={48} strokeWidth={1.5} />
      </div>
    );
  const step = (delta: number) =>
    setSelected((selected + delta + images.length) % images.length);
  const arrow =
    "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md hover:bg-white hover:text-primary";
  return (
    <section
      aria-label={t("gallery")}
      tabIndex={0}
      className="rounded-2xl"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          step(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface">
        <Image
          src={images[selected].url}
          alt={images[selected].alt}
          fill
          priority
          sizes="(max-width:1024px) 100vw, 60vw"
          className="object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t("previousPhoto")}
              className={cn(arrow, "left-3")}
            >
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t("nextPhoto")}
              className={cn(arrow, "right-3")}
            >
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
              {selected + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              aria-label={t("photo", { number: i + 1 })}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-24",
                selected === i
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={image.thumbUrl}
                alt={image.alt}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
