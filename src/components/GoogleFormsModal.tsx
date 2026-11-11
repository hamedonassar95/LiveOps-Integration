import React, { useState } from 'react';
import {
  FileText,
  X,
  ExternalLink,
  Check,
  Loader2,
  Copy,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { createWallpaperFeedbackForm, fetchFormDetails, GoogleForm } from '../lib/googleForms.ts';

interface GoogleFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
}

export const GoogleFormsModal: React.FC<GoogleFormsModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
}) => {
  const { user, accessToken, signInWithGoogle } = useAuth();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdForm, setCreatedForm] = useState<{ formId: string; responderUri?: string } | null>(
    null
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lookup existing form
  const [lookupFormId, setLookupFormId] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [viewedForm, setViewedForm] = useState<GoogleForm | null>(null);

  if (!isOpen) return null;

  const handleCreateForm = async () => {
    if (!user || !accessToken) {
      await signInWithGoogle();
      return;
    }

    const confirmed = window.confirm(
      `Create a Google Form survey in your Google account to collect feedback for this wallpaper collection?\n\nTitle: "VibePaper Feedback: ${currentPrompt.slice(0, 30)}..."`
    );
    if (!confirmed) return;

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await createWallpaperFeedbackForm(accessToken, currentPrompt);
      setCreatedForm(result);
    } catch (err: any) {
      console.error('Error creating Google Form:', err);
      setErrorMessage(err.message || 'Failed to create Google Form');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLookupForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupFormId.trim() || !accessToken) return;

    setIsLookingUp(true);
    setErrorMessage(null);

    try {
      const form = await fetchFormDetails(accessToken, lookupFormId.trim());
      setViewedForm(form);
    } catch (err: any) {
      console.error('Lookup failed:', err);
      setErrorMessage(err.message || 'Failed to load form details');
    } finally {
      setIsLookingUp(false);
    }
  };

  const copyFormLink = () => {
    const link =
      createdForm?.responderUri || `https://docs.google.com/forms/d/${createdForm?.formId}/viewform`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="relative w-full max-w-lg bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Google Forms Integration</span>
                <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                  Workspace
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Generate feedback surveys and polls for your wallpapers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {!user ? (
            <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 text-center space-y-2.5">
              <p className="text-xs text-neutral-300">
                Sign in with your Google account to create and manage Google Forms directly from VibePaper.
              </p>
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-semibold text-xs transition-all shadow-sm active:scale-95"
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <>
              {/* Card 1: Create Wallpaper Survey */}
              <div className="p-4 rounded-2xl bg-neutral-950/60 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5 text-violet-400" />
                    <span>Create Feedback Form for Current Vibe</span>
                  </h4>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Creates a Google Form in your Drive titled{' '}
                  <strong className="text-neutral-200">
                    "{currentPrompt.slice(0, 35)}..."
                  </strong>{' '}
                  with rating questions and voting choices for upcoming wallpaper themes.
                </p>

                <button
                  type="button"
                  onClick={handleCreateForm}
                  disabled={isCreating}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Form in Google Workspace...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Create Google Form</span>
                    </>
                  )}
                </button>

                {createdForm && (
                  <div className="mt-3 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-400 font-semibold">
                      <span>✓ Google Form Created Successfully!</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={
                          createdForm.responderUri ||
                          `https://docs.google.com/forms/d/${createdForm.formId}/viewform`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <span>Open Form</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        onClick={copyFormLink}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center gap-1 border border-white/10"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied Link' : 'Copy Survey Link'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: View Form by ID */}
              <div className="p-4 rounded-2xl bg-neutral-950/40 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Inspect Existing Google Form</span>
                </h4>

                <form onSubmit={handleLookupForm} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={lookupFormId}
                    onChange={(e) => setLookupFormId(e.target.value)}
                    placeholder="Enter Google Form ID..."
                    className="flex-1 bg-neutral-950 border border-white/10 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLookingUp || !lookupFormId.trim()}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {isLookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                  </button>
                </form>

                {viewedForm && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-xs space-y-1.5">
                    <p className="font-semibold text-white">{viewedForm.info?.title || 'Form'}</p>
                    <p className="text-[11px] text-neutral-400">
                      Total items/questions: {viewedForm.items?.length || 0}
                    </p>
                    <a
                      href={`https://docs.google.com/forms/d/${viewedForm.formId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300"
                    >
                      <span>Edit in Google Forms</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
