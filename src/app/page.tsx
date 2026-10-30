
"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import {
  Sparkles,
  Globe2,
  ImageUp,
  WandSparkles,
  Code2,
  Download,
  FolderCode,
  Layers3,
  Palette,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ArrowRight,
  X,
  AlertCircle,
  MonitorPlay,
} from "lucide-react";

const LivePreview = dynamic(
  () => import("@/components/LivePreview"),
  { ssr: false }
);

type Mode = "url" | "image";
type Strength = "subtle" | "balanced" | "strong";

const demoFiles: Record<string, string> = {
  "/App.tsx": `
import "./styles.css";

export default function App() {
  return (
    <main className="hero">
      <div className="glow" />
      <div className="hero-content">
        <span className="eyebrow">✦ YOUR CREATIVE CANVAS</span>
        <h1>Where inspiration becomes reality.</h1>
        <p>
          Your AI-generated website will appear here.
          Analyze a reference and start creating.
        </p>
        <a href="#start">Start creating ↗</a>
      </div>
    </main>
  );
}
`,
  "/styles.css": `
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #0e0b18;
  color: white;
}
.hero {
  min-height: 100vh;
  padding: 50px;
  display: grid;
  place-items: center;
  text-align: center;
  background:
    radial-gradient(ellipse at 50% 35%, #4c296b, transparent 65%),
    #0e0b18;
}
.hero-content { max-width: 700px; }
.eyebrow {
  color: #bca4ff;
  font-size: 12px;
  letter-spacing: 3px;
}
h1 {
  font-size: clamp(38px, 6vw, 74px);
  letter-spacing: -2px;
  line-height: 1.1;
}
p {
  color: #a6a2b6;
  font-size: 17px;
  line-height: 1.8;
}
a {
  display: inline-block;
  margin-top: 20px;
  background: #9267e8;
  border-radius: 12px;
  color: white;
  text-decoration: none;
  padding: 15px 25px;
}
`,
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageURL, setImageURL] = useState("");
  const [brief, setBrief] = useState("");
  const [prompt, setPrompt] = useState(
    "Create an original premium personal portfolio for a creative developer. Include a modern hero, about section, projects, skills, services, and contact section. Add elegant animations, responsive navigation, and polished UI."
  );
  const [strength, setStrength] = useState<Strength>("balanced");
  const [files, setFiles] = useState(demoFiles);
  const [generation, setGeneration] = useState(0);
  const [projectName, setProjectName] = useState("Creative Playground");
  const [projectDescription, setProjectDescription] = useState(
    "Your generated React application will appear here."
  );
  const [loading, setLoading] = useState<"analyze" | "generate" | null>(null);
  const [hasProject, setHasProject] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Studio ready");

  const imageInput = useRef<HTMLInputElement>(null);
  const currentFiles = useRef<Record<string, string>>(demoFiles);

  const onFilesChange = useCallback((next: Record<string, string>) => {
    currentFiles.current = next;
  }, []);

  function selectImage(file?: File) {
    if (!file) return;

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      setError("Please select PNG, JPG or WebP under 4 MB.");
      return;
    }

    setImage(file);
    setBrief("");
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      setImageURL(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (mode === "url" && !url.trim()) {
      setError("Enter a website URL.");
      return;
    }

    if (mode === "image" && !image) {
      setError("Upload a screenshot first.");
      return;
    }

    setLoading("analyze");
    setError("");
    setStatus("Analyzing inspiration...");

    try {
      const form = new FormData();
      form.append("action", "analyze");
      form.append("mode", mode);

      if (mode === "url") {
        form.append("url", url.trim());
      } else if (image) {
        form.append("image", image);
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Analysis failed.");
      }

      setBrief(result.brief);
      setStatus("Design analyzed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStatus("Analysis failed");
    } finally {
      setLoading(null);
    }
  }

  async function generate(refine = false) {
    if (!brief.trim()) {
      setError("Analyze your reference first.");
      return;
    }

    if (!prompt.trim()) {
      setError("Describe the website you want.");
      return;
    }

    setLoading("generate");
    setError("");
    setStatus(refine ? "Refining React project..." : "Generating React project...");

    try {
      const form = new FormData();
      form.append("action", "generate");
      form.append("brief", brief);
      form.append("prompt", prompt);
      form.append("strength", strength);

      if (refine && hasProject) {
        form.append("previous", JSON.stringify(currentFiles.current));
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Generation failed.");
      }

      currentFiles.current = result.files;
      setFiles(result.files);
      setGeneration((value) => value + 1);
      setProjectName(result.name || "Inspired Website");
      setProjectDescription(result.description || "A generated React project");
      setHasProject(true);
      setStatus("Project generated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("Generation failed");
    } finally {
      setLoading(null);
    }
  }

  async function exportZIP() {
    try {
      setError("");

      const zip = new JSZip();

      const slug =
        projectName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "inspired-website";

      zip.file(
        "package.json",
        JSON.stringify(
          {
            name: slug,
            version: "1.0.0",
            private: true,
            type: "module",
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview",
            },
            dependencies: {
              react: "^19.0.0",
              "react-dom": "^19.0.0",
            },
            devDependencies: {
              "@vitejs/plugin-react": "^4.7.0",
              "@types/react": "^19.0.0",
              "@types/react-dom": "^19.0.0",
              typescript: "~5.8.3",
              vite: "^6.3.0",
            },
          },
          null,
          2
        )
      );

      zip.file(
        "index.html",
        `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${slug}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
      );

      zip.file(
        "src/main.tsx",
        `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      );

      zip.file(
        "tsconfig.json",
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              lib: ["ES2020", "DOM", "DOM.Iterable"],
              module: "ESNext",
              moduleResolution: "Bundler",
              jsx: "react-jsx",
              strict: true,
              skipLibCheck: true,
              noEmit: true,
              esModuleInterop: true,
              allowImportingTsExtensions: true,
            },
            include: ["src"],
          },
          null,
          2
        )
      );

      zip.file(
        "vite.config.ts",
        `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});`
      );

      for (const [path, content] of Object.entries(currentFiles.current)) {
        const valid =
          path === "/App.tsx" ||
          path === "/styles.css" ||
          /^\/components\/[A-Za-z][A-Za-z0-9_-]*\.tsx$/.test(path);

        if (valid) {
          zip.file(`src${path}`, content);
        }
      }

      zip.file(
        "README.md",
        `# ${projectName}

${projectDescription}

## Get started

Run:

npm install
npm run dev

Open the localhost URL displayed by Vite.

Created using Reverse Studio.
`
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = href;
      link.download = `${slug}.zip`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  }

  const busy = loading !== null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={23} />
          </div>
          <div>
            <strong>REVERSE<span>STUDIO</span></strong>
            <small>INSPIRE • CREATE • BUILD</small>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <div className="side-active">
          <Layers3 size={18} />
          AI Website Builder
        </div>

        <div className="side-label side-space">WORKFLOW</div>

        <div className="steps">
          {[
            ["01", "Choose inspiration"],
            ["02", "Analyze design"],
            ["03", "Generate React project"],
            ["04", "Edit and export"],
          ].map(([number, title]) => (
            <div className="step" key={number}>
              <span>{number}</span>
              <p>{title}</p>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="model-box">
            <span className="green-dot" />
            <div>
              <strong>Gemini Engine</strong>
              <small>Server-side AI integration</small>
            </div>
          </div>
          <p>Reverse Studio 2.0</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <b>Studio</b>
          </div>
          <div className="top-status">
            <span className="green-dot" />
            {status}
          </div>
        </header>

        <div className="dashboard">
          <div className="intro">
            <div className="eyebrow">
              <Sparkles size={15} /> AI-POWERED CREATIVE STUDIO
            </div>
            <h1>Turn inspiration into <span>creation.</span></h1>
            <p>
              Discover a design you love, understand its visual language,
              and build your own original React website.
            </p>
          </div>

          <div className="workspace-grid">
            <section className="settings-panel">
              <div className="section-heading">
                <div>
                  <Palette size={19}/>
                  <strong>Design Reference</strong>
                </div>
                <span className="step-label">01</span>
              </div>

              <div className="mode-tabs">
                <button
                  className={mode === "url" ? "active" : ""}
                  onClick={() => {
                    setMode("url");
                    setBrief("");
                    setError("");
                  }}
                >
                  <Globe2 size={16}/> Website URL
                </button>

                <button
                  className={mode === "image" ? "active" : ""}
                  onClick={() => {
                    setMode("image");
                    setBrief("");
                    setError("");
                  }}
                >
                  <ImageUp size={16}/> Screenshot
                </button>
              </div>

              {mode === "url" ? (
                <div className="source-input">
                  <label htmlFor="referenceURL">Reference website</label>
                  <input
                    id="referenceURL"
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setBrief("");
                    }}
                    placeholder="https://example.com"
                  />
                  <p>
                    URL analysis reads available webpage content.
                    For accurate visual inspiration, upload a screenshot.
                  </p>
                </div>
              ) : (
                <div className="upload-area">
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => selectImage(e.target.files?.[0])}
                  />

                  {imageURL ? (
                    <div className="image-container">
                      <img src={imageURL} alt="Reference screenshot"/>
                      <button
                        title="Remove image"
                        onClick={() => {
                          setImage(null);
                          setImageURL("");
                          setBrief("");
                        }}
                      >
                        <X size={15}/>
                      </button>
                      <button
                        className="change-image"
                        onClick={() => imageInput.current?.click()}
                      >
                        Change screenshot
                      </button>
                    </div>
                  ) : (
                    <button
                      className="upload-button"
                      onClick={() => imageInput.current?.click()}
                    >
                      <ImageUp size={29}/>
                      <strong>Upload screenshot</strong>
                      <span>PNG, JPG, WebP • Max 4 MB</span>
                    </button>
                  )}
                </div>
              )}

              <button
                className="secondary-btn full"
                onClick={analyze}
                disabled={busy}
              >
                {loading === "analyze"
                  ? <LoaderCircle className="spin" size={17}/>
                  : <Sparkles size={17}/>}
                {loading === "analyze" ? "Analyzing..." : "Analyze Inspiration"}
              </button>

              {brief && (
                <div className="brief-result">
                  <div className="result-title">
                    <CheckCircle2 size={17}/>
                    Design analysis ready
                  </div>
                  <textarea
                    aria-label="Editable design brief"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                  />
                  <small>You can edit this brief before generating.</small>
                </div>
              )}

              <div className="divider"/>

              <div className="section-heading">
                <div>
                  <WandSparkles size={19}/>
                  <strong>Build Your Website</strong>
                </div>
                <span className="step-label">02</span>
              </div>

              <label className="field-label" htmlFor="projectPrompt">
                Describe your project
              </label>

              <textarea
                id="projectPrompt"
                className="project-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the type of website and features..."
              />

              <label className="field-label strength-label">
                Inspiration strength
              </label>

              <div className="strength-options">
                {(["subtle", "balanced", "strong"] as Strength[]).map(
                  (option) => (
                    <button
                      key={option}
                      className={strength === option ? "active" : ""}
                      onClick={() => setStrength(option)}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>

              <p className="strength-description">
                {strength === "subtle"
                  ? "Borrow the design mood and color atmosphere."
                  : strength === "balanced"
                  ? "Use a similar vibe with a fresh original layout."
                  : "Follow broad visual patterns more closely without copying assets."}
              </p>

              {error && (
                <div className="error">
                  <AlertCircle size={17}/>
                  <span>{error}</span>
                </div>
              )}

              <button
                className="primary-btn full"
                onClick={() => generate(false)}
                disabled={busy || !brief}
              >
                {loading === "generate"
                  ? <LoaderCircle size={18} className="spin"/>
                  : <WandSparkles size={18}/>}
                {loading === "generate"
                  ? "Generating project..."
                  : "Generate React Website"}
                {!busy && <ArrowRight size={17}/>}
              </button>

              {hasProject && (
                <button
                  className="secondary-btn full refine-btn"
                  onClick={() => generate(true)}
                  disabled={busy}
                >
                  <RefreshCw size={16}/>
                  Refine Existing Project
                </button>
              )}

              <p className="hint">
                To refine, update the description above and select
                Refine Existing Project.
              </p>
            </section>

            <section className="editor-panel">
              <div className="editor-header">
                <div>
                  <div className="project-title">
                    <FolderCode size={20}/>
                    <strong>{projectName}</strong>
                  </div>
                  <p>{projectDescription}</p>
                </div>

                <button className="export-btn" onClick={exportZIP}>
                  <Download size={16}/>
                  Export ZIP
                </button>
              </div>

              <div className="technology-bar">
                <span><Code2 size={15}/> React + TypeScript</span>
                <span><MonitorPlay size={15}/> Interactive Preview</span>
                <span><span className="green-dot"/> Live Editor</span>
              </div>

              <div className="sandpack-host">
                <LivePreview
                  key={generation}
                  files={files}
                  onFilesChange={onFilesChange}
                />
              </div>

              <div className="editor-footer">
                <span><CheckCircle2 size={15}/> Multi-file project</span>
                <span>Powered by Sandpack</span>
              </div>
            </section>
          </div>

          <footer className="footer">
            <span>Reverse Studio © 2026</span>
            <span>Inspired by design. Built with AI.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
