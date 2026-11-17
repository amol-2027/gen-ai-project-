import { prevUser } from "./context/UserContext";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
console.log(
  "API Key loaded:",
  apiKey ? "Yes (length: " + apiKey.length + ")" : "No - missing!",
);

const Api_Url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateResponse() {
  let RequestOption = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prevUser.prompt },
            ...(prevUser.data
              ? [
                  {
                    inline_data: {
                      mime_type: prevUser.mime_type,
                      data: prevUser.data,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    }),
  };

  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let response = await fetch(Api_Url, RequestOption);
      let data = await response.json();

      console.log("API Response:", data);

      if (!response.ok) {
        if (response.status === 503 && attempt < maxRetries - 1) {
          console.log(
            `API busy (503), retrying in ${2 ** attempt} seconds... (attempt ${attempt + 1}/${maxRetries})`,
          );
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new Error(
          `API request failed: ${response.status} ${JSON.stringify(data)}`,
        );
      }

      if (!data.candidates || !data.candidates[0]) {
        throw new Error("No candidates in response: " + JSON.stringify(data));
      }

      let apiResponse = data.candidates[0].content.parts[0].text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();

      return apiResponse;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
    }
  }

  throw lastError;
}
