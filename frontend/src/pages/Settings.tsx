import { useMe, useUpdateSettings } from '../lib/hooks'
import { Navbar } from '../components/Navbar'

export function Settings() {
  const { data: me, isLoading } = useMe()
  const update = useUpdateSettings()
  const updateError = update.isError ? 'Failed to save. Try again.' : null

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar user={me} />
        <div className="flex items-center justify-center h-64">
          <div className="text-white/30 animate-pulse text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar user={me} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Account</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Settings</h1>
          <p className="text-white/30 text-sm mt-1">Manage your profile visibility and notifications.</p>
        </div>

        {updateError && (
          <div className="mb-4 max-w-4xl px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {updateError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Public Profile</p>
                <p className="text-white/35 text-xs mt-1.5 leading-relaxed">Let anyone view your GitPulse stats at /u/{me?.login}</p>
              </div>
              <button
                onClick={() => update.mutate({ is_public: !me?.is_public })}
                disabled={update.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 mt-0.5 ${me?.is_public ? 'bg-emerald-500' : 'bg-white/[0.1]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${me?.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {me?.is_public && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">Your public URL</p>
                <a href={`/u/${me?.login}`} className="text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors">
                  {window.location.origin}/u/{me?.login}
                </a>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Weekly Email Digest</p>
                <p className="text-white/35 text-xs mt-1.5 leading-relaxed">Monday summary: PRs merged, streak status, impact score.</p>
                {!me?.email && (
                  <p className="text-amber-400/70 text-xs mt-2">No email on your GitHub account.</p>
                )}
              </div>
              <button
                onClick={() => update.mutate({ email_digest_opt: !me?.email_digest_opt })}
                disabled={update.isPending || !me?.email}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 shrink-0 mt-0.5 ${me?.email_digest_opt ? 'bg-emerald-500' : 'bg-white/[0.1]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${me?.email_digest_opt ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 lg:col-span-2">
            <p className="text-white font-semibold text-sm mb-1">README Badge</p>
            <p className="text-white/35 text-xs mb-5">Embed your Impact Score in your GitHub profile README.</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="shrink-0">
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">Preview</p>
                <img src={`/badge/${me?.login}`} alt="Your GitPulse badge" style={{ height: 44 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2.5">Markdown</p>
                <code className="block bg-black/40 text-emerald-400 text-xs p-4 rounded-xl font-mono overflow-x-auto border border-white/[0.04]">
                  {`[![GitPulse](${window.location.origin}/badge/${me?.login})](${window.location.origin}/u/${me?.login})`}
                </code>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
