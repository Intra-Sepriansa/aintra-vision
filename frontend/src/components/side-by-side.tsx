"use client";

interface SideBySideProps {
  leftB64?: string;
  rightB64?: string;
  captionLeft?: string;
  captionRight?: string;
}

export function SideBySide({
  leftB64,
  rightB64,
  captionLeft = "Asli",
  captionRight = "Hasil",
}: SideBySideProps) {
  if (!leftB64 && !rightB64) return null;
  const leftSrc = leftB64 ? `data:image/png;base64,${leftB64}` : undefined;
  const rightSrc = rightB64 ? `data:image/png;base64,${rightB64}` : undefined;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <figure className="rounded-2xl border bg-white p-2">
        {leftSrc && (
          <img
            src={leftSrc}
            alt={captionLeft}
            className="mx-auto max-h-[360px] w-full object-contain"
          />
        )}
        <figcaption className="mt-2 text-center text-xs text-neutral-500">
          {captionLeft}
        </figcaption>
      </figure>
      <figure className="rounded-2xl border bg-white p-2">
        {rightSrc && (
          <img
            src={rightSrc}
            alt={captionRight}
            className="mx-auto max-h-[360px] w-full object-contain"
          />
        )}
        <figcaption className="mt-2 text-center text-xs text-neutral-500">
          {captionRight}
        </figcaption>
      </figure>
    </div>
  );
}

