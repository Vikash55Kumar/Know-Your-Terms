import "react-circular-progressbar/dist/styles.css";
import type { CitizenOutput } from "../../types";

const CircularScore: React.FC<{ score: number }> = ({ score }) => {
  // Score is out of 10, convert to percent
  const percent = Math.round((score / 10) * 100);
  const radius = 40;
  const stroke = 7;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return (
    <svg height={radius * 2} width={radius * 2} className="block mx-auto">
      <circle
        stroke="#e5e7eb"
        fill="none"
        strokeWidth={stroke}
        cx={radius}
        cy={radius}
        r={normalizedRadius}
      />
      <circle
        stroke="#2563eb"
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.5s' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fontSize="1.2rem"
        fill="#000000"
        fontWeight="bold"
      >
        {percent}%
      </text>
    </svg>
  );
};

export default function CitizenSummary({ aiRawOutput }: { aiRawOutput: CitizenOutput }) {
  // Defensive: get title if present and is a string
  const summaryTitle = aiRawOutput.Header.Document_Name || 'Citizen Contract Summary';
  // Parse confidence score (strip % if present)
  const confidenceScore = parseInt((aiRawOutput.Confidence_and_Risk_Score.Confidence || '').replace(/[^\d]/g, ''), 10) || 0;
  return (
    <div className="relative flex flex-col md:flex-row max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-col gap-0 w-full">
        {/* Fixed Title */}
        {/* Fixed Title */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-6 rounded-lg px-8 w-full">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🎓 {aiRawOutput.Header.Document_Name}
          </h1>
          <div className="text-sm text-gray-500 mt-1">
            📄 {aiRawOutput.Header.Document_Type} &mdash; 🗓️ {aiRawOutput.Header.Date} &mdash; 🌏 {aiRawOutput.Header.Jurisdiction}
          </div>
        </div>
        {/* Left: Scrollable Content */}
        <div className="w-full">
          <div className="bg-white rounded-2xl p-8 space-y-10 max-h-[600px] overflow-y-auto">

            {/* Overview */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">📝 Overview</h3>
              <p className="text-gray-700 leading-relaxed text-sm">{aiRawOutput.Overview}</p>
            </div>

            {/* Parties Involved */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">🤝 Parties Involved</h3>
              <div className="grid grid-cols-1 md:grid-row-2 gap-4">
                <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                  <li><b>Party 1:</b> {aiRawOutput.Parties_Involved.Party_1}</li>
                  <li><b>Party 2:</b> {aiRawOutput.Parties_Involved.Party_2}</li>
                  <li><b>Relationship:</b> {aiRawOutput.Parties_Involved.Relationship}</li>
                  <li className='mt-2'><b>Key Obligations:</b> {aiRawOutput.Parties_Involved.Key_Obligations}</li>
                </ul>
              </div>
            </div>

            {/* Key Terms */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🔑 Key Terms</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                <li><b>Duration/Tenure:</b> {aiRawOutput.Key_Terms.Duration_or_Tenure}</li>
                <li><b>Payment/Consideration:</b> {aiRawOutput.Key_Terms.Payment_or_Consideration}</li>
                <li><b>Transfer of Rights:</b> {aiRawOutput.Key_Terms.Transfer_of_Rights}</li>
                <li><b>Termination/Cancellation:</b> {aiRawOutput.Key_Terms.Termination_or_Cancellation}</li>
                <li><b>Witness/Attestation:</b> {aiRawOutput.Key_Terms.Witness_or_Attestation}</li>
              </ul>
            </div>

            {/* Rights and Obligations */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">⚖️ Rights & Obligations</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                <li><b>Rights of Party 1:</b> {aiRawOutput.Rights_and_Obligations.Rights_of_Party_1}</li>
                <li><b>Rights of Party 2:</b> {aiRawOutput.Rights_and_Obligations.Rights_of_Party_2}</li>
                <li><b>Mutual Obligations:</b> {aiRawOutput.Rights_and_Obligations.Mutual_Obligations}</li>
              </ul>
            </div>

            {/* Applicable Laws and Acts */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📚 Applicable Laws & Acts</h3>
              <div className="mb-2">
                <div className="font-semibold text-sm text-gray-700">Explicit Acts:</div>
                <ul className="list-disc pl-6 text-neutral-700 text-sm">
                  {aiRawOutput.Applicable_Laws_and_Acts.Explicit_Acts.length > 0 ? aiRawOutput.Applicable_Laws_and_Acts.Explicit_Acts.map((act, i) => (
                    <li key={i}><strong>{act.Act}</strong>{act.Relevance ? `: ${act.Relevance}` : act.Reason ? `: ${act.Reason}` : ''}</li>
                  )) : <li className="text-gray-400">None</li>}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-700">Implicit Acts:</div>
                <ul className="list-disc pl-6 text-neutral-700 text-sm">
                  {aiRawOutput.Applicable_Laws_and_Acts.Implicit_Acts.length > 0 ? aiRawOutput.Applicable_Laws_and_Acts.Implicit_Acts.map((act, i) => (
                    <li key={i}><strong>{act.Act}</strong>: {act.Reason}</li>
                  )) : <li className="text-gray-400">None</li>}
                </ul>
              </div>
            </div>

            {/* Validation Status */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">✅ Validation Status</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                <li><b>Legally Compliant:</b> {aiRawOutput.Validation_Status.Is_Legally_Compliant}</li>
                <li><b>Requires Registration:</b> {aiRawOutput.Validation_Status.Requires_Registration}</li>
                <li><b>Missing Clauses:</b> {aiRawOutput.Validation_Status.Missing_Clauses && aiRawOutput.Validation_Status.Missing_Clauses.length > 0 ? aiRawOutput.Validation_Status.Missing_Clauses.join(', ') : 'None'}</li>
              </ul>
            </div>

            {/* Risk and Compliance */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🛡️ Risk & Compliance</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                {aiRawOutput.Risk_and_Compliance.map((issue, i) => (
                  <li key={i}><b>Issue:</b> {issue.Issue} <br /><b>Recommendation:</b> {issue.Recommendation}</li>
                ))}
              </ul>
            </div>

            {/* Simple Summary */}
            <div className="p-6 rounded-xl bg-gray-50 border">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🧾 Simple Summary</h3>
              <p className="text-gray-700 mt-2">{aiRawOutput.Simple_Summary}</p>
            </div>

            {/* Footer Branding (Web) */}
            <footer className="pt-6 border-t border-gray-100 text-center text-xs text-neutral-400">
              Generated by <span className="font-semibold">Know Your Terms</span>
            </footer>
          </div>
        </div>
      </div>

      {/* Right: Score & Recommendations */}
      <div className="md:w-1/4 w-full flex-shrink-0">
        <div className="bg-white shadow rounded-2xl py-6 px-4 flex flex-col items-center mb-6 sticky top-28" style={{ minHeight: 340 }}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Confidence Score</h3>
          <CircularScore score={confidenceScore} />
          <p className="text-gray-600 text-sm mt-2">This score reflects the AI's confidence in the accuracy of the extracted terms.</p>
          <div className="mt-6 w-full">
            <h4 className="text-base font-semibold text-gray-800 mb-2">Recommendations</h4>
            <div className="overflow-y-auto max-h-[55vh] border rounded-lg bg-gray-50">
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                {aiRawOutput.Recommendations && aiRawOutput.Recommendations.length > 0
                  ? aiRawOutput.Recommendations.map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))
                  : <li className="text-gray-400">No recommendations available</li>
                }
              </ul>
            </div>
          </div>

          <div className="flex gap-4 mt-6 w-full justify-center">
            <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-200 transition">Video</button>
          </div>
          <div className="mt-6 text-center text-xs text-neutral-400">
            <button className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-200 transition">Mind Map</button>
          </div>
        </div>
      </div>

    </div>
  );
}
