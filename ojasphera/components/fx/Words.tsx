/** Splits a line into words that rise into place one after another (CSS only). */
export function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="words" style={delay ? ({ "--d": `${delay}ms` } as React.CSSProperties) : undefined}>
      {text.split(" ").map((w, i, all) => (
        <span key={i}>
          <span style={{ "--i": i } as React.CSSProperties}>
            {w}
            {i < all.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </span>
  );
}
