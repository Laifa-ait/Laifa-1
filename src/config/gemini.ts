import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Determine the active API key: prioritize user's custom key if provided, then fallback to default
const activeApiKey = process.env.GEMINI_API_KEY || "missing_key_force_error";

// Initialize Gemini - force api key mode to prevent ADC Vertex AI fallback
export const ai = new GoogleGenAI({
  apiKey: activeApiKey,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});
