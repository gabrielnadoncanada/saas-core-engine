export function CodeBlock(props: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border bg-muted p-4 text-xs">
      <code>{props.children}</code>
    </pre>
  );
}
