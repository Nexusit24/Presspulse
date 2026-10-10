import React from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onKeepLocal: () => void;
  onLoadServer: () => void;
  serverModifiedDate?: string;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onKeepLocal,
  onLoadServer,
  serverModifiedDate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-stone-900">
            Remote Changes Detected
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            This article was updated on WordPress
            {serverModifiedDate ? ` around ${new Date(serverModifiedDate).toLocaleTimeString()}` : ''} while you had it open here.
          </p>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
          To prevent accidentally overwriting newer server content, please choose how you would like to proceed:
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onKeepLocal}
            className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-stone-900 text-amber-300 hover:bg-stone-800 transition"
          >
            Keep My Local Changes (Overwrite Server)
          </button>

          <button
            type="button"
            onClick={onLoadServer}
            className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition"
          >
            Load Server Version (Discard Local Edits)
          </button>
        </div>
      </div>
    </div>
  );
};
