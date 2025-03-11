import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.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});

async function getGroqChatStream(ques) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
          You are a mental health support assistant. Your role is to provide emotional support, offer coping strategies, 
          and connect users with therapists if needed. Follow these instructions:
          1. Greet the user warmly and empathetically.
          2. Acknowledge their feelings and encourage them to share.
          3. Ask open-ended questions to understand their situation better.
          4. Validate their emotions and reassure them that it’s okay to feel this way.
          5. Offer practical coping strategies like deep breathing or journaling.
          6. Assess the urgency of their feelings by asking them to rate their intensity on a scale of 1 to 10.
          7. If they are in crisis, provide immediate resources like crisis hotlines.
          8. Suggest connecting with a therapist if their issues require professional help.
          9. Follow up to see if they need further assistance.
          10. End the conversation gracefully and remind them you’re here for support.
          11. Keep responses concise (30-50 words) and limit follow-up questions to 3 or fewer.
          12. Personalize responses based on their input.
          13. Provide educational resources like articles or apps.
          14. Encourage self-care and remind them to prioritize their well-being.
          15. Respect their boundaries if they don’t want to share or seek help.
        `,
      },
      {
        role: "user",
        content: `${ques}. Please respond in 30-50 words and don't ask more than 3 questions.`,
      },
    ],
    model: "llama3-8b-8192",
    temperature: 0.5,
    max_tokens: 1024,
    top_p: 1,
    stop: null,
    stream: true,
  });
}

async function main(ques) {
  try {
    const stream = await getGroqChatStream(ques);
    let result = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) result += content;
    }
    return result || "No response received";
  } catch (error) {
    console.error("GROQ.js-->", error);
    throw error; // Rethrow the error to handle it in the calling function
  }
}

// Example usage
const userQuestion = "I’ve been feeling really down lately. Can you help me?";
main(userQuestion).then(console.log);

export { main };