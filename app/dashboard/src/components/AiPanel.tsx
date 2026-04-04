import { X, Bot, Loader2, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './Button';

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
  response: { output: string; loading: boolean } | null;
  onAsk: (endpoint: 'explain-state' | 'explain-fault' | 'session-summary') => void;
  hasFault: boolean;
}

export function AiPanel({ isOpen, onClose, response, onAsk, hasFault }: AiPanelProps) {
  if (!isOpen) return null;

  const isError = response?.output?.includes('AI Assistant unavailable') || response?.output?.includes('AI Assistant error');

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-500" />
          <h2 className="font-black uppercase tracking-tight text-slate-100">AI Assistant</h2>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 border-b border-slate-800">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Available Actions</p>
        <div className="grid grid-cols-1 gap-2">
          <Button variant="secondary" size="sm" onClick={() => onAsk('explain-state')} className="justify-start">
            <MessageSquare className="w-3 h-3" /> Explain Current State
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => onAsk('explain-fault')} 
            className="justify-start"
            disabled={!hasFault}
          >
            <AlertCircle className="w-3 h-3" /> Explain Last Fault
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onAsk('session-summary')} className="justify-start">
            <FileText className="w-3 h-3" /> Summarize Session
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
        {!response ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30">
            <Bot className="w-12 h-12 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Select an action to begin analysis</p>
          </div>
        ) : response.loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gemini is analyzing machine data...</p>
          </div>
        ) : isError ? (
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 text-red-200 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="font-bold uppercase tracking-wider text-xs">Configuration Error</span>
            </div>
            <p>{response.output}</p>
            <p className="mt-4 text-xs opacity-70">Please check your GEMINI_API_KEY environment variable.</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-800 text-slate-300 font-sans leading-relaxed">
              <ReactMarkdown>{response.output}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <p className="text-[9px] text-slate-600 uppercase tracking-tighter leading-tight">
          AI outputs are advisory only. Always verify machine conditions physically before taking maintenance actions.
        </p>
      </div>
    </div>
  );
}
