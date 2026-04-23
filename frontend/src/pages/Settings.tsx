import { useMe, useUpdateSettings } from '../lib/hooks'
import { Navbar } from '../components/Navbar'

export function Settings() {
  const { data: me, isLoading } = useMe()
  const update = useUpdateSettings()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={me} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
          {/* Public profile toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Public Profile</p>
              <p className="text-gray-400 text-sm">Allow anyone to view your GitPulse profile at /u/{me?.login}</p>
            </div>
            <button
              onClick={() => update.mutate({ is_public: !me?.is_public })}
              disabled={update.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${me?.is_public ? 'bg-purple-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${me?.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="border-t border-gray-700" />

          {/* Email digest toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Weekly Email Digest</p>
              <p className="text-gray-400 text-sm">Get a Monday summary: PRs merged, streak status, impact score change.</p>
              {!me?.email && (
                <p className="text-yellow-500 text-xs mt-1">⚠ No email on your GitHub account — digest won't send.</p>
              )}
            </div>
            <button
              onClick={() => update.mutate({ email_digest_opt: !me?.email_digest_opt })}
              disabled={update.isPending || !me?.email}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${me?.email_digest_opt ? 'bg-purple-600' : 'bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${me?.email_digest_opt ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="border-t border-gray-700" />

          {/* README badge */}
          <div>
            <p className="text-white font-medium mb-2">README Badge</p>
            <p className="text-gray-400 text-sm mb-3">
              Embed your Impact Score and streak in your GitHub profile README.
            </p>
            <img src={`/badge/${me?.login}`} alt="Your GitPulse badge" className="h-5 mb-3" />
            <code className="block bg-gray-800 text-green-400 text-xs p-3 rounded-md font-mono overflow-x-auto">
              {`[![GitPulse](${window.location.origin}/badge/${me?.login})](${window.location.origin}/u/${me?.login})`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
