export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(message: string, history: Message[] = []) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to connect to AI");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
