import * as coda from "@codahq/packs-sdk";
import { callOpenAI } from "../ai/handlers";
import { landingPagePrompt } from "../ai/prompts";

export const pack = coda.newPack();

pack.addFormula({
  name: "GenerateLandingCopy",
  description: "Generate landing page copy for a property site.",
  parameters: [
    coda.makeParameter({type: coda.ParameterType.String, name: "propertyName", description: "Name of the property"}),
    coda.makeParameter({type: coda.ParameterType.String, name: "location", description: "City or region"}),
    coda.makeParameter({type: coda.ParameterType.String, name: "vibe", description: "Luxury, modern, etc."}),
  ],
  resultType: coda.ValueType.String,
  execute: async function ([propertyName, location, vibe], context) {
    const prompt = landingPagePrompt(propertyName, location, vibe);
    return await callOpenAI(prompt);
  },
});
