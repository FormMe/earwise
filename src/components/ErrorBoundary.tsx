import { Component, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defence: show a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('EarWise crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const ru = (navigator.language || 'ru').toLowerCase().startsWith('ru');
    return (
      <div className="crash">
        <div className="crash-emoji">🎻💥</div>
        <h1>{ru ? 'Что-то сломалось' : 'Something broke'}</h1>
        <p className="muted">
          {ru ? 'Прогресс сохранён. Попробуй перезапустить приложение.' : 'Your progress is saved. Try reloading the app.'}
        </p>
        <button className="btn primary big" onClick={() => location.reload()}>
          {ru ? 'Перезапустить' : 'Reload'}
        </button>
        <details className="small muted">
          <summary>{ru ? 'Подробности' : 'Details'}</summary>
          <pre>{String(this.state.error?.stack ?? this.state.error)}</pre>
        </details>
      </div>
    );
  }
}
