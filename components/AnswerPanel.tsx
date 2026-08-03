"use client";

export interface Metric {
  k: string;
  v: string;
  hero?: boolean;
}

interface AnswerPanelProps {
  variant: "stream" | "nonstream";
  name: string;
  tag: string;
  text: string;
  loading: boolean;
  streaming: boolean;
  placeholder: string;
  metrics: Metric[];
}

export default function AnswerPanel({
  variant,
  name,
  tag,
  text,
  loading,
  streaming,
  placeholder,
  metrics,
}: AnswerPanelProps) {
  return (
    <section className={`panel ${variant}`}>
      <div className="panel-head">
        <span className="name">
          <span className="dot" />
          {name}
        </span>
        <span className="tag">{tag}</span>
      </div>

      <div className="answer">
        {text ? (
          <>
            <span>{text}</span>
            {streaming && <span className="cursor" />}
          </>
        ) : loading ? (
          <span className="placeholder">
            {variant === "nonstream" && <span className="spinner" />}
            {placeholder}
          </span>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
      </div>

      <div className="metrics">
        {metrics.map((m) => (
          <div className="metric" key={m.k}>
            <div className="k">{m.k}</div>
            <div className={`v ${m.hero ? "hero" : ""}`}>{m.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
