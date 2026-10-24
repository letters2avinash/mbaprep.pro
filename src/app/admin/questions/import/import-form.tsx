"use client";

import { useActionState } from "react";
import { importQuestionsCsv } from "./actions";
import type { ImportReport, ImportState } from "@/lib/questions/import-questions";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(importQuestionsCsv, null);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Question bank CSV</span>
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Checking and importing..." : "Upload and import"}
        </button>
      </form>

      {state?.message && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {state.message}
        </p>
      )}

      {state?.report && <ReportView report={state.report} />}
    </div>
  );
}

function ReportView({ report }: { report: ImportReport }) {
  const refused = report.fileError !== null || report.writeError !== null;

  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Import report: {report.fileName}</h2>

      {report.fileError && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          File refused. Nothing was written. {report.fileError}
        </p>
      )}
      {report.writeError && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {report.writeError}
        </p>
      )}

      {!refused && (
        <dl className="grid grid-cols-2 gap-2 sm:w-80">
          <dt>Rows accepted</dt>
          <dd className="font-semibold">{report.acceptedCount}</dd>
          <dt>Rows written</dt>
          <dd className="font-semibold">{report.writtenCount}</dd>
          <dt>Rows rejected</dt>
          <dd className="font-semibold">{report.rejected.length}</dd>
        </dl>
      )}

      {report.rejected.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Line</th>
                <th className="py-2 pr-4">question_code</th>
                <th className="py-2">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {report.rejected.map((row) => (
                <tr key={row.line} className="border-b align-top">
                  <td className="py-2 pr-4">{row.line}</td>
                  <td className="py-2 pr-4 font-mono">{row.question_code || "(blank)"}</td>
                  <td className="py-2">
                    <ul className="list-disc pl-5">
                      {row.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
