import { createServerFn } from "@tanstack/react-start";

/* ============================================================
   AI Scanning — recipe / product / invoice / barcode
   Calls Lovable AI Gateway with structured tool-calling output
   ============================================================ */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ScanMode = "recipe" | "product" | "invoice";

const RECIPE_TOOL = {
  type: "function",
  function: {
    name: "extract_recipe",
    description: "Extract a recipe from a photo of handwritten or printed recipe text.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the dish" },
        station: { type: "string", description: "Best-guess kitchen station (Flat Top, Fryer, Sauté, Char Grill, Cold Line, Pastry, etc.)" },
        yield: { type: "string", description: "Yield or serving size if visible" },
        confidence: { type: "number", description: "0-1 confidence in extraction" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string", description: "ea, lb, oz, g, kg, ml, L, cup, tbsp, tsp, sl, etc." },
              category: { type: "string", description: "Produce, Protein, Dairy, Bakery, Pantry, Frozen, Beverage" },
            },
            required: ["name", "qty", "unit"],
            additionalProperties: false,
          },
        },
        steps: { type: "array", items: { type: "string" }, description: "Prep / cook steps if legible" },
      },
      required: ["name", "ingredients", "confidence"],
      additionalProperties: false,
    },
  },
} as const;

const PRODUCT_TOOL = {
  type: "function",
  function: {
    name: "extract_products",
    description: "Extract one or many products from a photo of packaging, a box label, a barcode, or a delivery invoice.",
    parameters: {
      type: "object",
      properties: {
        vendor: { type: "string", description: "Vendor or supplier name if visible on the label/invoice" },
        confidence: { type: "number", description: "0-1 confidence in extraction" },
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              brand: { type: "string" },
              qty: { type: "number", description: "Quantity received" },
              unit: { type: "string", description: "ea, lb, oz, case, ml, L, kg, g" },
              packSize: { type: "string", description: "e.g. '24 ct', '5 lb bag'" },
              category: { type: "string", description: "Produce, Protein, Dairy, Bakery, Pantry, Frozen, Beverage" },
              station: { type: "string", description: "Best-guess station (Flat Top, Fryer, Sauté, Char Grill, Cold Line)" },
              suggestedPar: { type: "number", description: "Suggested par level based on packaging size" },
              barcode: { type: "string", description: "UPC/EAN if visible" },
              unitCost: { type: "number", description: "Unit cost from invoice if visible" },
            },
            required: ["name", "qty", "unit", "category"],
            additionalProperties: false,
          },
        },
      },
      required: ["products", "confidence"],
      additionalProperties: false,
    },
  },
} as const;

export const scanImage = createServerFn({ method: "POST" })
  .inputValidator((input: { imageBase64: string; mode: ScanMode; mimeType?: string }) => {
    if (!input.imageBase64 || typeof input.imageBase64 !== "string") throw new Error("imageBase64 required");
    if (!["recipe", "product", "invoice"].includes(input.mode)) throw new Error("invalid mode");
    if (input.imageBase64.length > 12_000_000) throw new Error("image too large (max ~9MB)");
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY is not configured" };
    }

    const mime = data.mimeType || "image/jpeg";
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:${mime};base64,${data.imageBase64}`;

    const isRecipe = data.mode === "recipe";
    const tool = isRecipe ? RECIPE_TOOL : PRODUCT_TOOL;
    const toolName = isRecipe ? "extract_recipe" : "extract_products";

    const systemPrompt = isRecipe
      ? "You are a culinary OCR expert. Extract recipes from photos — handwritten notes, printed sheets, or recipe binders. Be precise about quantities and units. Normalize units to standard kitchen abbreviations (ea, lb, oz, g, kg, ml, L, cup, tbsp, tsp, sl). If a value is unclear, make a reasonable estimate and lower the confidence score."
      : "You are a restaurant receiving and inventory expert. From the photo (packaging, box label, barcode, food item, or invoice), extract every distinct product visible. Estimate sensible par levels based on pack size. Categorize each item and assign the most likely kitchen station. If you see an invoice, extract every line item.";

    const userPrompt = isRecipe
      ? "Extract the full recipe from this image. Return every ingredient with its quantity and unit."
      : data.mode === "invoice"
        ? "This is a delivery invoice. Extract every line item — product name, quantity, unit, pack size, and price if visible. Identify the vendor."
        : "Identify every product in this image. Provide name, quantity, unit, category, and a suggested station. Include the barcode if visible.";

    try {
      const resp = await fetch(GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });

      if (resp.status === 429) {
        return { ok: false as const, error: "Rate limit exceeded. Please wait a moment and try again." };
      }
      if (resp.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." };
      }
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("AI gateway error", resp.status, txt);
        return { ok: false as const, error: `AI gateway error (${resp.status})` };
      }

      const json = await resp.json();
      const call = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) {
        return { ok: false as const, error: "Model returned no structured output" };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        return { ok: false as const, error: "Failed to parse model output" };
      }

      return { ok: true as const, mode: data.mode, result: parsed };
    } catch (err) {
      console.error("scanImage error", err);
      return { ok: false as const, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
