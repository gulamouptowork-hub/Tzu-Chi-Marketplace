"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ImagePlus, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { Button, cn } from "@/components/ui/button";
type Category = { id: string; nameZh: string; nameEn: string };
type Point = { id: string; campus: string; nameZh: string; nameEn: string };
async function compress(file: File): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("IMAGE");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("IMAGE"))),
      "image/webp",
      0.85,
    ),
  );
}
type Initial = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  priceNtd: number | null;
  isFree: boolean;
  openToTrade: boolean;
  campuses: string[];
  meetupLocation: string;
  images: { id: string; thumbUrl?: string; alt?: string }[];
};
const sectionTitle = "text-base font-semibold text-foreground";
export function ListingForm({
  categories,
  points,
  locale,
  initial,
}: {
  categories: Category[];
  points: Point[];
  locale: string;
  initial?: Initial;
}) {
  const t = useTranslations("ListingForm");
  const toast = useToast();
  const router = useRouter();
  const [campuses, setCampuses] = useState<string[]>(
    initial?.campuses ?? ["JIEREN"],
  );
  const [mode, setMode] = useState(
    initial?.isFree ? "free" : initial?.openToTrade ? "trade" : "price",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [existingImages, setExistingImages] = useState(initial?.images ?? []);
  const previewUrls = useRef(new Set<string>());
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => {
    // The form streams in before hydration; files picked in that window fire
    // no React change event, so adopt them once the form is interactive.
    if (photoInput.current?.files?.length) selectPhotos(photoInput.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function selectPhotos(input: HTMLInputElement) {
    const selected = Array.from(input.files ?? []);
    input.value = "";
    if (!selected.length) return;
    if (
      existingImages.length + files.length + selected.length > 6 ||
      selected.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      setPhotoError(t("photoError"));
      return;
    }
    const added = selected.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      return { file, url };
    });
    setFiles((current) => [...current, ...added]);
    setPhotoError("");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (existingImages.length + files.length < 1) {
      setPhotoError(t("photoError"));
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (existingImages.length + files.length > 6) throw new Error("IMAGE");
      const imageIds: string[] = existingImages.map((image) => image.id);
      for (const { file } of files) {
        const blob = await compress(file);
        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "presign",
            mimeType: "image/webp",
            bytes: blob.size,
          }),
        });
        if (!response.ok) throw new Error("UPLOAD");
        const upload = await response.json();
        const stored = await fetch(upload.url, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: blob,
        });
        if (!stored.ok) throw new Error("UPLOAD");
        const complete = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", id: upload.id }),
        });
        if (!complete.ok) throw new Error("UPLOAD");
        imageIds.push(upload.id);
      }
      const data = {
        title: form.get("title"),
        description: form.get("description"),
        categoryId: form.get("categoryId"),
        condition: form.get("condition"),
        priceNtd: mode === "price" ? Number(form.get("priceNtd")) : null,
        isFree: mode === "free",
        openToTrade: mode === "trade",
        campuses,
        meetupLocation: form.get("meetupLocation"),
        imageIds,
      };
      const response = await fetch(
        initial ? "/api/listings/" + initial.id : "/api/listings",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("SAVE");
      const listing = await response.json();
      toast(t("published"));
      router.push("/listings/" + listing.id);
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card space-y-5 p-6">
        <h2 className={sectionTitle}>{t("details")}</h2>
        <label className="block">
          {t("title")}
          <input
            name="title"
            required
            minLength={2}
            maxLength={100}
            defaultValue={initial?.title}
          />
        </label>
        <label className="block">
          {t("description")}
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            defaultValue={initial?.description}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            {t("category")}
            <select name="categoryId" defaultValue={initial?.categoryId}>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {locale === "en" ? c.nameEn : c.nameZh}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {t("condition")}
            <select name="condition" defaultValue={initial?.condition}>
              {["NEW", "LIKE_NEW", "GOOD", "FAIR"].map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <fieldset className="card p-6">
        <legend className="sr-only">{t("pricing")}</legend>
        <p aria-hidden="true" className={sectionTitle}>
          {t("pricing")}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 ring-1 ring-border">
          {["price", "free", "trade"].map((m) => (
            <label key={m} className="cursor-pointer">
              <input
                type="radio"
                name="mode"
                className="peer sr-only"
                checked={mode === m}
                onChange={() => setMode(m)}
              />
              <span className="flex h-10 items-center justify-center rounded-lg text-sm font-medium text-muted peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                {t(m)}
              </span>
            </label>
          ))}
        </div>
        {mode === "price" && (
          <div className="relative mt-4">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
              NT$
            </span>
            <input
              aria-label={t("price")}
              name="priceNtd"
              type="number"
              min={1}
              max={1000000}
              required
              defaultValue={initial?.priceNtd ?? ""}
              className="pl-14 text-base font-semibold"
            />
          </div>
        )}
      </fieldset>
      <fieldset className="card p-6">
        <legend className="sr-only">{t("campuses")}</legend>
        <p aria-hidden="true" className={sectionTitle}>
          {t("campuses")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["JIEREN", "JIANGUO", "CENTRAL"].map((c) => {
            const checked = campuses.includes(c);
            return (
              <label key={c} className="cursor-pointer">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={(e) =>
                    setCampuses(
                      e.target.checked
                        ? [...campuses, c]
                        : campuses.filter((v) => v !== c),
                    )
                  }
                />
                <span
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
                    checked
                      ? "border-primary bg-sky text-primary"
                      : "border-border-strong bg-surface text-muted hover:border-primary/40",
                  )}
                >
                  {checked && <Check size={16} strokeWidth={1.75} />}
                  {t(c)}
                </span>
              </label>
            );
          })}
        </div>
        <label className="mt-5 block">
          {t("point")}
          <select
            name="meetupLocation"
            required
            defaultValue={initial?.meetupLocation}
          >
            {points
              .filter((p) => campuses.includes(p.campus))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.campus)} — {locale === "en" ? p.nameEn : p.nameZh}
                </option>
              ))}
          </select>
        </label>
      </fieldset>
      <section className="card p-6">
        <h2 className={sectionTitle}>{t("photos")}</h2>
        <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border-strong bg-surface-muted px-6 py-8 text-center hover:border-primary/50 hover:bg-sky">
          <span className="flex size-12 items-center justify-center rounded-full bg-sky text-primary">
            <ImagePlus size={24} strokeWidth={1.75} />
          </span>
          <input
            name="photos"
            aria-label={t("photos")}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            ref={photoInput}
            disabled={busy}
            onChange={(event) => selectPhotos(event.currentTarget)}
            aria-describedby="listing-photo-hint"
            aria-invalid={!!photoError}
            className="mt-4 max-w-xs"
          />
          <span
            id="listing-photo-hint"
            className="mt-3 text-xs font-normal text-muted"
          >
            {t(initial ? "replace" : "photoHint")}
          </span>
        </label>
        {photoError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {photoError}
          </p>
        )}
        {existingImages.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium text-muted">
              {t("currentPhotos")}
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {existingImages.map((image, index) => (
                <li
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border bg-sky"
                >
                  {image.thumbUrl && (
                    <Image
                      src={image.thumbUrl}
                      alt={image.alt ?? ""}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={busy}
                    className="absolute right-1 top-1 z-10 size-8 rounded-full bg-white text-slate-900 shadow-sm hover:bg-danger-soft hover:text-danger"
                    aria-label={t("removePhoto", { number: index + 1 })}
                    title={t("removePhoto", { number: index + 1 })}
                    onClick={() => {
                      setExistingImages((current) =>
                        current.filter((item) => item.id !== image.id),
                      );
                      setPhotoError("");
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
        {files.length > 0 && (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {files.map(({ url }, index) => (
              <li
                key={url}
                className="relative aspect-square overflow-hidden rounded-lg border border-border bg-sky"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  className="absolute right-1 top-1 z-10 size-8 rounded-full bg-white text-slate-900 shadow-sm hover:bg-danger-soft hover:text-danger"
                  aria-label={t("removePhoto", {
                    number: existingImages.length + index + 1,
                  })}
                  title={t("removePhoto", {
                    number: existingImages.length + index + 1,
                  })}
                  onClick={() => {
                    URL.revokeObjectURL(url);
                    previewUrls.current.delete(url);
                    setFiles((current) =>
                      current.filter((_, position) => position !== index),
                    );
                    setPhotoError("");
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={busy || campuses.length === 0}
          className="w-full sm:w-auto"
        >
          {t(busy ? "uploading" : initial ? "save" : "publish")}
        </Button>
      </div>
    </form>
  );
}
