export const N8N_WEBHOOK_URL = "https://devtin.app.n8n.cloud/webhook/iaya-med";

export async function sendMessageToN8n(message, sessionId) {
  if (!N8N_WEBHOOK_URL) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return `He procesado tu solicitud: "${message}". ¿Prefieres una versión directa o la desarrollamos paso a paso?`;
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId })
  });

  if (!response.ok) {
    throw new Error(`El servicio respondió con ${response.status}.`);
  }

  const data = await response.json();
  return data.reply ?? data.output ?? data.response ?? data.message ?? String(data);
}