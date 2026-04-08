import { useState } from "react";
import { useAuthStore, signIn } from "@opennative/shared";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import type { UserInfo } from "@opennative/shared";

export function SignInScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const storeSetServerUrl = useAuthStore((s) => s.setServerUrl);
  const storedUrl = useAuthStore((s) => s.serverUrl);

  const [serverUrl, setServerUrl] = useState(storedUrl ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!serverUrl.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn(serverUrl.trim(), email.trim(), password);
      storeSetServerUrl(serverUrl.trim());
      const userInfo: UserInfo = {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        profile_image_url: result.profile_image_url,
      };
      setAuth(result.token, userInfo);
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleSignIn();
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0d0d0d]">
      <div className="w-full max-w-sm px-6">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">OpenNativeUI</h1>
          <p className="mt-1 text-sm text-neutral-400">Connect to your Open WebUI server</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          <input
            type="url"
            placeholder="Server URL (e.g. http://localhost:3000)"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl bg-[#1a1a1a] border border-neutral-700 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-colors"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl bg-[#1a1a1a] border border-neutral-700 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-colors"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-xl bg-[#1a1a1a] border border-neutral-700 px-4 py-3 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950 border border-red-800 px-4 py-3">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
