"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="prose-page" role="alert">
      <h1 className="h-hero">That did not load</h1>
      <p>Something failed on our side. Your list is stored in this browser and is safe.</p>
      <p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </p>
      {error.digest ? <p className="mono text-mute">Reference {error.digest}</p> : null}
    </div>
  );
}
