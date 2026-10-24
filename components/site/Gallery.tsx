'use client';
// Gallery and lightbox (roadmap task 5.17, spec 05 FR-40, FR-41). The page shows the committed thumbnails;
// the full-size Wikimedia file is requested only when the lightbox opens. Every image has its credit and
// source link below it (R4). The lightbox is a modal <dialog>: focus stays inside while it is open and
// returns to the photo that opened it. Arrow keys, Esc, swipe, and Previous/Next/Close buttons all work.
// Without JavaScript each thumbnail links to its source page. An owner's photo has no web page: it shows
// its credit without a Source link, and the lightbox shows its thumbnail.

import { useEffect, useRef, useState } from 'react';
import { T } from '@/components/T';
import { both, formatCount } from '@/lib/format';
import type { ImageRecord } from '@/lib/types';

const TILES = 4;
const n = (v: number) => both(formatCount, v);

function Credit({ image }: { image: ImageRecord }) {
  return (
    <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]" lang="en" data-credit>
      {image.credit}{image.sourcePage ? <> · <a href={image.sourcePage} target="_blank" rel="noopener noreferrer" className="underline"><T k="gallery.source" /></a></> : null}
    </p>
  );
}

export function Gallery({ images }: { images: ImageRecord[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const show = (k: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    opener.current = e.currentTarget;
    setOpen(k);
  };
  // Focus returns to the opener once the dialog has closed (a modal dialog keeps the page inert until then).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open !== null) wasOpen.current = true;
    else if (wasOpen.current) { wasOpen.current = false; opener.current?.focus(); }
  }, [open]);
  const [first, ...rest] = images;
  const tiles = rest.slice(0, TILES);
  const thumb = (im: ImageRecord, k: number, className: string, eager = false) => (
    <a href={im.sourcePage ?? im.full} onClick={show(k)} className="block" data-gallery-open={k}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails */}
      <img src={im.thumb} alt={im.alt} lang={im.altLang} width={480} height={360} loading={eager ? 'eager' : 'lazy'} className={className} />
      <span className="sr-only"><T k="gallery.open" vars={{ n: n(k + 1), count: n(images.length) }} /></span>
    </a>
  );
  return (
    <div data-gallery>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <figure>
          {thumb(first, 0, 'aspect-[4/3] w-full rounded-lg object-cover', true)}
          <figcaption><Credit image={first} /></figcaption>
        </figure>
        {tiles.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {tiles.map((im, k) => (
              <li key={im.id}>
                <figure>{thumb(im, k + 1, 'aspect-[4/3] w-full rounded-md object-cover')}<figcaption><Credit image={im} /></figcaption></figure>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {images.length > TILES + 1 ? (
        <button type="button" className="mt-3 inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold"
          onClick={e => { opener.current = e.currentTarget; setOpen(0); }}>
          <T k="gallery.all" vars={{ count: n(images.length) }} />
        </button>
      ) : null}
      {open !== null ? <Lightbox images={images} start={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function Lightbox({ images, start, onClose }: { images: ImageRecord[]; start: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(start);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const touch = useRef<number | null>(null);
  const count = images.length;
  const go = (d: number) => setK(i => (i + d + count) % count);
  const im = images[k];

  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => d.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby="lightbox-title" onCancel={e => { e.preventDefault(); onClose(); }}
      onKeyDown={e => { if (count > 1 && e.key === 'ArrowRight') go(1); if (count > 1 && e.key === 'ArrowLeft') go(-1); }}
      className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 text-bg backdrop:bg-ink/80" data-lightbox>
      <div className="flex h-full flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lightbox-title" className="font-semibold">
            <T k="lightbox.label" /> · <span data-counter><T k="lightbox.counter" vars={{ n: n(k + 1), count: n(count) }} /></span>
          </h2>
          <button type="button" onClick={onClose} className="min-h-tap min-w-tap rounded-md border border-bg/40 px-3 font-semibold"><T k="lightbox.close" /></button>
        </div>
        <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-4"
          onPointerDown={e => { touch.current = e.clientX; }}
          onPointerUp={e => { if (touch.current !== null && count > 1 && Math.abs(e.clientX - touch.current) > 50) go(e.clientX < touch.current ? 1 : -1); touch.current = null; }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the full file is loaded only here, from Wikimedia */}
          <img key={im.id} src={failed.has(k) ? im.thumb : im.full} alt={im.alt} lang={im.altLang}
            onError={() => setFailed(f => new Set(f).add(k))} draggable={false}
            className="max-h-full min-h-0 max-w-full select-none object-contain" />
          <figcaption className="max-w-3xl text-center text-sm [overflow-wrap:anywhere]">
            {failed.has(k) ? <p className="font-semibold"><T k="lightbox.unavailable" /></p> : null}
            <p lang="en">{im.credit}{im.sourcePage ? <> · <a href={im.sourcePage} target="_blank" rel="noopener noreferrer" className="underline"><T k="gallery.source" /></a></> : null}</p>
          </figcaption>
        </figure>
        {count > 1 ? (
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => go(-1)} className="min-h-tap rounded-md border border-bg/40 px-4 font-semibold"><T k="lightbox.prev" /></button>
            <button type="button" onClick={() => go(1)} className="min-h-tap rounded-md border border-bg/40 px-4 font-semibold"><T k="lightbox.next" /></button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
