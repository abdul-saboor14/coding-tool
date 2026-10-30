
"use client";

import { useEffect, useRef } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackFileExplorer,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";

type Props = {
  files: Record<string, string>;
  onFilesChange: (files: Record<string, string>) => void;
};

function FileObserver({
  onFilesChange,
}: {
  onFilesChange: Props["onFilesChange"];
}) {
  const { sandpack } = useSandpack();
  const callback = useRef(onFilesChange);

  useEffect(() => {
    callback.current = onFilesChange;
  }, [onFilesChange]);

  useEffect(() => {
    const updated: Record<string, string> = {};

    for (const [path, item] of Object.entries(sandpack.files)) {
      if (
        path === "/App.tsx" ||
        path === "/styles.css" ||
        /^\/components\/[A-Za-z][A-Za-z0-9_-]*\.tsx$/.test(path)
      ) {
        updated[path] = item.code;
      }
    }

    callback.current(updated);
  }, [sandpack.files]);

  return null;
}

export default function LivePreview({
  files,
  onFilesChange,
}: Props) {
  return (
    <SandpackProvider
      template="react-ts"
      theme="dark"
      files={files}
      options={{
        autorun: true,
        autoReload: true,
        recompileMode: "delayed",
        recompileDelay: 500,
      }}
    >
      <FileObserver onFilesChange={onFilesChange} />

      <div className="preview-workspace">
        <SandpackLayout>
          <div className="editor-column">
            <div className="panel-caption">
              PROJECT FILES
            </div>

            <SandpackFileExplorer
              style={{ height: 180 }}
            />

            <div className="panel-caption">
              SOURCE CODE
            </div>

            <SandpackCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
              style={{ height: 430 }}
            />
          </div>

          <div className="preview-column">
            <div className="panel-caption">
              LIVE REACT PREVIEW
            </div>

            <SandpackPreview
              showNavigator
              showRefreshButton
              style={{ height: 500 }}
            />

            <div className="panel-caption">
              CONSOLE & ERRORS
            </div>

            <SandpackConsole
              style={{ height: 150 }}
            />
          </div>
        </SandpackLayout>
      </div>
    </SandpackProvider>
  );
}
