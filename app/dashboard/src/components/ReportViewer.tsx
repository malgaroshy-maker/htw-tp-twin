import { X, FileText, Download, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './Button';

interface ReportViewerProps {
  report: string | null;
  onClose: () => void;
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            <h2 className="font-black uppercase tracking-tight text-slate-100">Session Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="hidden md:flex">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 font-serif">
          <div className="max-w-2xl mx-auto prose prose-slate max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="md" onClick={() => {
            const blob = new Blob([report], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-report-${new Date().toISOString().split('T')[0]}.md`;
            a.click();
          }}>
            <Download className="w-4 h-4" /> Download .md
          </Button>
        </div>
      </div>
    </div>
  );
}
