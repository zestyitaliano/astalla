export async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = context.endpoint; // Secure key from Coda config
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{role: "user", content: prompt}]
    }),
  });
  const data = await res.json();
  return data.choices[0]?.message?.content ?? "No response.";
}
