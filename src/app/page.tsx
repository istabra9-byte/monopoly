'use client';

/**
 * Empire City — single-route client app.
 * The game is a fully client-side application (pure TS engines + React UI);
 * no server rendering to avoid state hydration issues with the game loop.
 */
import dynamic from 'next/dynamic';

const App = dynamic(() => import('../ui/App'), {
  ssr: false,
  loading: () => (
    <div className="ec-root flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--ec-brand)] border-t-transparent" />
        <p className="text-sm font-bold text-[var(--ec-ink-soft)]">Empire City</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
