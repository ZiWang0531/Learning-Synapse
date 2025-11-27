import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GraphData, NodeExplanation, SynthesisResult, KnowledgeCard } from "../types";

// Configuration
const MODEL_NAME = "gemini-2.5-flash";

const graphSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique identifier (kebab-case preferred)" },
          label: { type: Type.STRING, description: "Display name of the concept" },
          description: { type: Type.STRING, description: "A very short 10-word definition" },
          type: { type: Type.STRING, enum: ["concept"], description: "Always 'concept' for children" }
        },
        required: ["id", "label", "description", "type"]
      }
    },
    links: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: "ID of the source node" },
          target: { type: Type.STRING, description: "ID of the target node" },
          relationship: { type: Type.STRING, description: "Verb describing connection (e.g. 'contains', 'leads to')" }
        },
        required: ["source", "target"]
      }
    }
  },
  required: ["nodes", "links"]
};

const explanationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    definition: { type: Type.STRING, description: "A clear, academic definition (2 sentences)." },
    analogy: { type: Type.STRING, description: "A real-world metaphor to help understand it (e.g., 'Like a traffic cop...')." },
    keyFacts: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "3 bullet points of interesting trivia or core mechanics."
    }
  },
  required: ["definition", "analogy", "keyFacts"]
};

const synthesisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A creative title for the connection (e.g. 'The Digital Bridge')." },
    connection: { type: Type.STRING, description: "Explain how these specific concepts are related." },
    insight: { type: Type.STRING, description: "A profound or unexpected insight that emerges from combining them." }
  },
  required: ["title", "connection", "insight"]
};

const knowledgeCardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Catchy title for this specific fact." },
    category: { type: Type.STRING, description: "Category like 'History', 'Trivia', 'Paradox', 'Application'." },
    content: { type: Type.STRING, description: "A fascinating, specific paragraph about this aspect." }
  },
  required: ["title", "category", "content"]
};

// Helper to check for Chinese characters
const isChinese = (text: string): boolean => {
  return /[\u4e00-\u9fa5]/.test(text);
};

export const decomposeTopic = async (topic: string, parentId?: string): Promise<GraphData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const useChinese = isChinese(topic);
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  const prompt = parentId 
    ? `The user is learning about "${topic}" which is a sub-concept of "${parentId}". Break down "${topic}" into 5-7 distinct sub-concepts to help them understand it deeper. Return the nodes and the links connecting the parent ("${parentId}") to these new nodes, or connecting the new nodes to each other. ${langInstruction}`
    : `The user wants to learn about "${topic}". Break this topic down into 6-8 core sub-concepts that form the foundation of this knowledge. Return the nodes and relationships. One node MUST be the root node with id "${topic}" and type "root". ${langInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphSchema,
        temperature: 0.5,
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data as GraphData;
  } catch (error) {
    console.error("Gemini Graph Gen Error:", error);
    throw error;
  }
};

export const getConceptDetails = async (concept: string, contextNodes: string[]): Promise<NodeExplanation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const useChinese = isChinese(concept);
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Explain the concept "${concept}". Context: It is related to ${contextNodes.join(', ')}. Provide a clear definition, a helpful analogy, and 3 key facts. ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: explanationSchema,
        temperature: 0.6,
      },
    });

    return JSON.parse(response.text || "{}") as NodeExplanation;
  } catch (error) {
    console.error("Gemini Details Error:", error);
    throw error;
  }
};

export const generateConceptExplanation = async (concept: string): Promise<NodeExplanation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const useChinese = isChinese(concept);
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Explain the concept "${concept}". Provide a clear definition, a helpful analogy, and 3 key facts. ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: explanationSchema,
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text || "{}") as NodeExplanation;
  } catch (error) {
    console.error("Gemini Auto-Gen Error:", error);
    throw error;
  }
};

export const polishConceptExplanation = async (concept: string, draft: NodeExplanation): Promise<NodeExplanation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const useChinese = isChinese(concept) || isChinese(draft.definition);
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  const prompt = `
    The user wrote a draft explanation for the concept "${concept}". 
    Please polish and improve it. 
    1. Fix grammar and clarity.
    2. Make the definition more precise.
    3. Ensure the analogy is intuitive.
    4. Ensure facts are interesting and accurate.
    5. If fields are empty or very short, expand on them intelligently based on the concept "${concept}".

    Draft:
    Definition: ${draft.definition}
    Analogy: ${draft.analogy}
    Facts: ${draft.keyFacts.join("; ")}

    ${langInstruction}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: explanationSchema,
        temperature: 0.6,
      },
    });

    return JSON.parse(response.text || "{}") as NodeExplanation;
  } catch (error) {
    console.error("Gemini Polish Error:", error);
    throw error;
  }
};

export const synthesizeConcepts = async (concepts: string[]): Promise<SynthesisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  // Check if any of the concepts contain Chinese
  const useChinese = concepts.some(c => isChinese(c));
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `The user has selected the following concepts: ${concepts.join(', ')}. 
      Analyze the hidden relationships between them. How do they influence each other? 
      Synthesize a novel insight that comes from looking at these together. ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: synthesisSchema,
        temperature: 0.7,
      },
    });

    return JSON.parse(response.text || "{}") as SynthesisResult;
  } catch (error) {
    console.error("Gemini Synthesis Error:", error);
    throw error;
  }
};

export const generateKnowledgeCard = async (topic: string): Promise<KnowledgeCard> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const useChinese = isChinese(topic);
  const langInstruction = useChinese ? "Respond in Simplified Chinese (简体中文)." : "";

  // We use a high temperature and ask for "random" to ensure variety on repeat calls
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a SINGLE, RANDOM, and SPECIFIC 'Knowledge Encyclopedia Card' about the topic: "${topic}". 
      It should NOT be a general definition. Pick a specific historical event, a weird trivia fact, a paradoxical concept, or a cutting-edge application related to this topic.
      The goal is to surprise the learner.
      ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: knowledgeCardSchema,
        temperature: 0.9, // High temperature for variety
      },
    });

    return JSON.parse(response.text || "{}") as KnowledgeCard;
  } catch (error) {
    console.error("Gemini Card Gen Error:", error);
    throw error;
  }
};