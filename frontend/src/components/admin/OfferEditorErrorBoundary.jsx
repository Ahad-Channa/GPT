import { Component } from 'react';

// Containment only: an unexpected render error inside the offer editor shows a
// message and a close button instead of blanking the whole admin page. It does
// not replace fixing the underlying error.
export default class OfferEditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Offer editor crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="bg-[#0e1726] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 text-center space-y-3">
          <p className="text-sm font-bold text-white">The offer editor hit an unexpected error.</p>
          <p className="text-xs text-slate-400">Nothing was saved. Close the editor and try again; if it keeps happening, report it with the browser console output.</p>
          <button type="button" onClick={this.props.onClose} className="px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-white/20">Close editor</button>
        </div>
      </div>
    );
  }
}
