import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  language: string;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                {this.props.language === 'en' ? "Something went wrong" : "କିଛି ଭୁଲ୍ ହୋଇଛି"}
              </h1>
              <p className="text-slate-400 text-sm">
                {this.props.language === 'en' 
                  ? "An unexpected error occurred. Please try refreshing the page." 
                  : "ଏକ ଅପ୍ରତ୍ୟାଶିତ ତ୍ରୁଟି ଘଟିଛି | ଦୟାକରି ପୃଷ୍ଠାକୁ ପୁନର୍ବାର ଲୋଡ୍ କରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ |"}
              </p>
            </div>
            {process.env.NODE_ENV !== 'production' && (
              <div className="p-4 bg-black/40 rounded-2xl text-left overflow-auto max-h-40 scrollbar-thin">
                <code className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              {this.props.language === 'en' ? "Refresh Page" : "ପୃଷ୍ଠାକୁ ରିଫ୍ରେଶ୍ କରନ୍ତୁ"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
