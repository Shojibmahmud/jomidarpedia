'use client';
// A button that shows and hides a panel (the header's Divisions menu and the mobile menu).
// Opens on click, never on hover. Escape closes it and returns focus to the button; so does a click
// or focus move outside. aria-expanded tells assistive technology whether it is open.

import { useEffect, useId, useRef, useState } from 'react';

export function Disclosure({ button, children, buttonClassName = '', panelClassName = '', className = '' }: {
  button: React.ReactNode; children: React.ReactNode; buttonClassName?: string; panelClassName?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)} className={buttonClassName}>
        {button}
      </button>
      <div id={id} hidden={!open} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}
