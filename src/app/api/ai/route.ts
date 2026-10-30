
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const API =
  `https://generativelanguage.googleapis.com/v1beta/models/` +
  `${encodeURIComponent(MODEL)}:generateContent`;

const projectSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    description: { type: "STRING" },
    app: { type: "STRING" },
    css: { type: "STRING" },
  },
  required: ["name", "description", "app", "css"],
  propertyOrdering: ["name", "description", "app", "css"],
};

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

async function callGemini(
  parts: GeminiPart[],
  structured = false,
  urlMode = false
) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("Missing GEMINI_API_KEY in .env.local");
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: structured ? 0.5 : 0.35,
      maxOutputTokens: structured ? 16384 : 2048,
      ...(structured
        ? {
            responseMimeType: "application/json",
            responseSchema: projectSchema,
          }
        : {}),
    },
  };

  if (urlMode) {
    body.tools = [{ url_context: {} }];
  }

  const response = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55000),
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
      `Gemini API error ${response.status}`
    );
  }

  const candidate = result?.candidates?.[0];

  console.log("Gemini finish reason:", candidate?.finishReason);
  console.log(
    "Gemini output tokens:",
    result?.usageMetadata?.candidatesTokenCount
  );

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "Gemini reached its output limit. Try a smaller website " +
      "or reduce the number of requested features."
    );
  }

  const text = (candidate?.content?.parts || [])
    .map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function validateURL(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid HTTPS website URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.includes(".") ||
    url.hostname === "localhost" ||
    /\.(local|internal|localhost)$/i.test(url.hostname) ||
    /^[\d.]+$/.test(url.hostname)
  ) {
    throw new Error("Enter a public HTTPS website URL.");
  }

  return url.toString();
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const action = String(form.get("action") || "");

    // STEP 1: ANALYZE DESIGN
    if (action === "analyze") {
      const mode = String(form.get("mode") || "");

      const analysisPrompt = `
You are a senior UI/UX designer.

Analyze this reference as visual inspiration for
a new and original website.

Identify:
- Design mood and overall visual style
- Primary and secondary colors
- Typography characteristics
- Layout and section patterns
- Navigation and card styles
- Spacing, borders and shadows
- Animation and interaction ideas

Explain how to create a fresh website with
a similar visual atmosphere.

Do not reproduce brand names, logos, copyrighted
imagery or distinctive original content.

Return a concise design brief.

If only a webpage URL is available, distinguish
retrievable page content from visual details that
cannot be verified.
`;

      const parts: GeminiPart[] = [
        { text: analysisPrompt },
      ];

      let urlMode = false;

      if (mode === "image") {
        const image = form.get("image");

        if (!(image instanceof File)) {
          throw new Error("Upload a screenshot.");
        }

        if (
          !["image/png", "image/jpeg", "image/webp"].includes(image.type) ||
          image.size > 4 * 1024 * 1024
        ) {
          throw new Error(
            "Use a PNG, JPG or WebP under 4 MB."
          );
        }

        const base64 = Buffer.from(
          await image.arrayBuffer()
        ).toString("base64");

        parts.push({
          inlineData: {
            mimeType: image.type,
            data: base64,
          },
        });
      } else if (mode === "url") {
        const url = validateURL(
          String(form.get("url") || "")
        );

        parts.push({
          text: `Reference website: ${url}`,
        });

        urlMode = true;
      } else {
        throw new Error("Invalid reference mode.");
      }

      const brief = await callGemini(
        parts,
        false,
        urlMode
      );

      return NextResponse.json({ brief });
    }

    // STEP 2: GENERATE REACT PROJECT
    if (action === "generate") {
      const prompt = String(
        form.get("prompt") || ""
      ).slice(0, 3000);

      const brief = String(
        form.get("brief") || ""
      ).slice(0, 8000);

      const strength = String(
        form.get("strength") || "balanced"
      );

      const previous = String(
        form.get("previous") || ""
      ).slice(0, 50000);

      if (!prompt.trim() || !brief.trim()) {
        throw new Error(
          "Analyze a reference and describe your project."
        );
      }

      const generationPrompt = `
You are an expert React developer and premium UI designer.

Create a beautiful, ORIGINAL React + TypeScript website.

USER REQUEST:
${prompt}

DESIGN INSPIRATION:
${brief}

INSPIRATION STRENGTH:
${strength}

${previous
  ? `EXISTING PROJECT TO IMPROVE:\n${previous}`
  : ""}

CRITICAL OUTPUT RULES:

Return a JSON object with exactly four properties:

"name": short project name
"description": short project summary
"app": complete App.tsx React source code
"css": complete styles.css source code

TECHNICAL REQUIREMENTS:

1. The app property must contain valid React TSX.
2. Export default function App().
3. Include: import "./styles.css";
4. Generate all JSX inside App.tsx.
5. Use no separate React component files.
6. Local functions and components in App.tsx are allowed.
7. Use React hooks when needed.
8. No third-party libraries or external dependencies.
9. Do not import Next.js modules.
10. Do not use Tailwind or CSS frameworks.
11. Put styling in the css property.
12. Use CSS variables for colors where useful.
13. Create responsive layouts.
14. Implement functional mobile navigation.
15. Use original branding and content.
16. Include smooth CSS hover effects.
17. Use no external images or URLs.
18. Use CSS gradients, inline SVG or visual shapes.
19. Make the design feel polished and modern.
20. Return complete working code, not placeholders.

IMPORTANT:
Keep the total output compact enough to finish reliably.
Aim for approximately 100-180 lines of React TSX and
150-250 lines of CSS.

Prioritize reliable, functioning code over excessive
sections or unnecessary complexity.

Do not use Markdown code fences.
`;

      const raw = await callGemini(
        [{ text: generationPrompt }],
        true
      );

      let project: {
        name?: string;
        description?: string;
        app?: string;
        css?: string;
      };

      try {
        project = JSON.parse(raw);
      } catch {
        throw new Error(
          "Gemini did not return valid JSON. " +
          "Try a shorter project description."
        );
      }

      if (
        typeof project.app !== "string" ||
        typeof project.css !== "string" ||
        !project.app.trim() ||
        !project.css.trim()
      ) {
        throw new Error(
          "Gemini returned missing React or CSS code."
        );
      }

      const app = project.app;
      const css = project.css;

      if (
        !/export\s+default/.test(app) ||
        !app.includes("./styles.css")
      ) {
        throw new Error(
          "Gemini returned an invalid App.tsx structure."
        );
      }

      console.log("Generated React characters:", app.length);
      console.log("Generated CSS characters:", css.length);

      return NextResponse.json({
        name: String(
          project.name || "Inspired Website"
        ).slice(0, 80),

        description: String(
          project.description || "AI generated React website"
        ).slice(0, 400),

        files: {
          "/App.tsx": app,
          "/styles.css": css,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error.";

    console.error("Reverse Studio error:", message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
