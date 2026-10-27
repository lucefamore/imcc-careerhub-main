import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentProfile, availableJobs } = req.body;

  if (!studentProfile || !availableJobs) {
    return res.status(400).json({ error: 'Missing candidate profile or job data.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are the IMCC Career Hub AI Counselor.
      Analyze the student profile and recommend the top matching jobs from the provided list.

      Student Profile:
      ${JSON.stringify(studentProfile, null, 2)}

      Available Job Listings:
      ${JSON.stringify(availableJobs, null, 2)}

      Return a JSON array of recommended job IDs with match scores (0-100%) and brief reasoning.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return res.status(200).json({ recommendations: responseText });
  } catch (error) {
    console.error("Career Agent Error:", error);
    return res.status(500).json({ error: "Failed to process recommendations." });
  }
}
