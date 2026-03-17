interface VectelSuggestion {
  title: string;
  description: string | null;
}

const VECTEL_API_URL = "https://api.vectel.ai/v1";

export const getSuggestions = async (
  existingTasks: string[]
): Promise<VectelSuggestion[]> => {
  const apiKey = process.env.VECTEL_API_KEY;

  if (!apiKey) {
    throw new Error("VECTEL_API_KEY is not configured");
  }

  const response = await fetch(`${VECTEL_API_URL}/suggest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      context: existingTasks,
      count: 3,
      type: "task_suggestions",
    }),
  });

  if (!response.ok) {
    throw new Error(`Vectel API error: ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions ?? [];
};
