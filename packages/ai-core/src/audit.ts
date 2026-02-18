export function getRequestMeta(
  messages: Array<{ role: string; content: string }>,
) {
  const messageCount = messages.length;
  const promptChars = messages.reduce(
    (sum, m) => sum + (m.content?.length ?? 0),
    0,
  );
  return { messageCount, promptChars };
}

