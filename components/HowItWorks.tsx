export default function HowItWorks() {
  return (
    <div className="how">
      <span className="eyebrow">How it works</span>
      <h2 style={{ marginTop: 12 }}>One question, two ways to deliver the answer</h2>
      <p className="lead">
        Both panels ask the <b style={{ color: "var(--text)" }}>exact same question</b>, use the{" "}
        <b style={{ color: "var(--text)" }}>same sources</b> from Azure AI Search, and the{" "}
        <b style={{ color: "var(--text)" }}>same GPT&#8209;4.1 model</b>. The only difference is{" "}
        <b style={{ color: "var(--text)" }}>how the answer is sent back to you</b> — all at once,
        or token&#8209;by&#8209;token as it is written.
      </p>

      <div className="flow">
        <span className="node">Your question</span>
        <span className="arrow">→</span>
        <span className="node">AI Search (retrieve sources once)</span>
        <span className="arrow">→</span>
        <span className="split">
          <span className="node magenta">Non&#8209;streaming: wait, then show all</span>
          <span className="node cyan">Streaming: show each token live</span>
        </span>
      </div>

      <div className="how-grid">
        <div className="how-card">
          <div className="num">01 · RETRIEVAL</div>
          <h3>Grounding with your data</h3>
          <p>
            We query your Azure AI Search indexes <b>once</b> and take the most relevant passages.
            Those passages ground both answers, so neither panel has an unfair advantage.
          </p>
        </div>
        <div className="how-card">
          <div className="num">02 · NON&#8209;STREAMING</div>
          <h3>Wait for the whole thing</h3>
          <p>
            The model writes the full answer, then sends it in <b>one response</b>. You stare at a
            spinner until it is completely done — good for machines, slow&#8209;feeling for people.
          </p>
        </div>
        <div className="how-card">
          <div className="num">03 · STREAMING</div>
          <h3>See it as it is written</h3>
          <p>
            The model sends <b>each token the moment it is generated</b>. Text appears almost
            immediately. The key metric is <b>Time To First Token (TTFT)</b> — how fast the user
            sees <i>something</i>.
          </p>
        </div>
        <div className="how-card">
          <div className="num">04 · WHY IT MATTERS</div>
          <h3>Same total time, better feel</h3>
          <p>
            Both often finish at a similar total time, but streaming feels dramatically faster
            because the wait before <b>first output</b> drops from seconds to milliseconds.
          </p>
        </div>
      </div>
    </div>
  );
}
