'use client';
// The correction form: an email address, a subject and a message, sent to Web3Forms, which emails them to the
// project address with the site, field and page the link carried. With JavaScript it posts in place and shows
// the result; without it, the plain form post still goes through and Web3Forms shows its own result page.

import { useState } from 'react';
import { T } from '@/components/T';
import { text, type StringKey } from '@/lib/i18n';
import { WEB3FORMS_KEY, WEB3FORMS_URL } from '@/lib/nav';
import type { CorrectionContext } from '@/lib/site-page';
import { useUiLang } from '@/lib/use-ui-lang';

const FIELD = 'min-h-tap w-full rounded-md border border-line-strong bg-surface px-3 py-2';

export function CorrectionForm({ ctx, titleId, onDone }: { ctx: CorrectionContext; titleId: string; onDone?: () => void }) {
  const lang = useUiLang();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const photo = ctx.field === 'photo';
  const subject = [text(photo ? 'correct.subjectPhoto' : 'correct.subjectDefault', lang), ctx.siteId].filter(Boolean).join(' · ');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const data = new FormData(e.currentTarget);
    data.set('subject', `Jomidarpedia: ${data.get('subject')}`);
    try {
      const res = await fetch(WEB3FORMS_URL, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
      const json = await res.json().catch(() => ({}));
      setState(res.ok && json.success ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  const title: StringKey = photo ? 'correct.photoTitle' : 'correct.suggest';
  return (
    <div className="space-y-4" data-correction-form>
      <h2 id={titleId} className="pr-10 font-serif text-h3"><T k={title} /></h2>
      {state === 'sent' ? (
        <>
          <p role="status" className="rounded-lg border border-line bg-surface-2 p-4" data-correction-sent><T k="correct.sent" /></p>
          {onDone ? <button type="button" onClick={onDone} className="inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold"><T k="correct.close" /></button> : null}
        </>
      ) : (
        <form action={WEB3FORMS_URL} method="post" onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted"><T k={photo ? 'correct.photoIntro' : 'correct.intro'} /></p>
          <input type="hidden" name="access_key" value={WEB3FORMS_KEY} />
          <input type="hidden" name="from_name" value="Jomidarpedia" />
          {ctx.siteId ? <input type="hidden" name="site_id" value={ctx.siteId} /> : null}
          {ctx.field ? <input type="hidden" name="field" value={ctx.field} /> : null}
          {ctx.pageUrl ? <input type="hidden" name="page_url" value={ctx.pageUrl} /> : null}
          {/* Web3Forms drops any submission with this box ticked: people never see it, spam bots fill it in. */}
          <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <label className="block space-y-1">
            <span className="text-sm font-semibold"><T k="correct.email" /></span>
            <input type="email" name="email" required autoComplete="email" maxLength={200} className={FIELD} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold"><T k="correct.subject" /></span>
            <input type="text" name="subject" required defaultValue={subject} maxLength={150} className={FIELD} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold"><T k="correct.message" /></span>
            <textarea name="message" required rows={6} maxLength={5000} className={`${FIELD} resize-y`} />
          </label>
          {state === 'error' ? <p role="alert" className="rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-correction-error><T k="correct.error" /></p> : null}
          <button type="submit" disabled={state === 'sending'} data-correction-send
            className="inline-flex min-h-tap items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60">
            <T k={state === 'sending' ? 'correct.sending' : 'correct.send'} />
          </button>
        </form>
      )}
    </div>
  );
}
