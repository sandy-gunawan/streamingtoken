"use client";

import { useEffect, useState } from "react";

export default function Preloader() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`preloader ${hidden ? "hidden" : ""}`} aria-hidden={hidden}>
      <div className="brand">Azure AI Search · RAG</div>
      <div className="bar">
        <span />
      </div>
    </div>
  );
}
