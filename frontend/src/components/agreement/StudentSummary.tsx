import { FileText } from "lucide-react";
import React from "react";
import type { StudentOutput } from "../../types";

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
        fontSize="1.5rem"
        fill="#000000"
        fontWeight="bold"
      >
        {percent}%
      </text>
    </svg>
  );
};

const StudentSummary: React.FC<{ aiRawOutput: StudentOutput }> = ({ aiRawOutput }) => {
  // console.log("Summary Component Rendered with data:", aiRawOutput);

  // Score: use Confidence_and_Risk_Score.Confidence (out of 10)
  const score = parseInt(aiRawOutput.Confidence_and_Risk_Score.Confidence, 10) || 0;

  return (
    <div className="max-w-7xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-0 flex flex-col md:flex-row h-[77.2vh]">
      {/* Left: Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8 gap-0">
        {/* Fixed Header */}
        <header className="border-b px-2 py-6 bg-white z-10 sticky top-0 flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🎓 {aiRawOutput.Header.Document_Name}
          </h1>
          <div className="text-sm text-gray-500 mt-1">
            📄 {aiRawOutput.Header.Document_Type} &mdash; 🗓️ {aiRawOutput.Header.Date} &mdash; 🌏 {aiRawOutput.Header.Jurisdiction}
          </div>
        </header>

        {/* Overview */}
        <section className="mt-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center mb-2 gap-2">
            <FileText className="w-5 h-5" /> <span>Overview</span>
          </h2>
          <p className="text-gray-700 leading-relaxed text-base">{aiRawOutput.Overview}</p>
        </section>

        {/* Parties Involved */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🤝 Parties Involved</h3>
          <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-base">
            <li><strong>Party 1:</strong> {aiRawOutput.Parties_Involved.Party_1}</li>
            <li><strong>Party 2:</strong> {aiRawOutput.Parties_Involved.Party_2}</li>
            <li><strong>Relationship:</strong> {aiRawOutput.Parties_Involved.Relationship}</li>
            <li><strong>Key Obligations:</strong> {aiRawOutput.Parties_Involved.Key_Obligations}</li>
          </ul>
        </section>

        {/* Key Terms */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📝 Key Terms</h3>
          <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-base">
            <li><strong>Duration/Tenure:</strong> {aiRawOutput.Key_Terms.Duration_or_Tenure}</li>
            <li><strong>Stipend/Payment:</strong> {aiRawOutput.Key_Terms.Stipend_or_Payment}</li>
            <li><strong>Roles & Responsibilities:</strong> {aiRawOutput.Key_Terms.Roles_and_Responsibilities}</li>
            <li><strong>Termination/Exit Clause:</strong> {aiRawOutput.Key_Terms.Termination_or_Exit_Clause}</li>
            <li><strong>Ownership/IP:</strong> {aiRawOutput.Key_Terms.Ownership_or_IP}</li>
            <li><strong>Confidentiality/NDA:</strong> {aiRawOutput.Key_Terms.Confidentiality_or_NDA}</li>
          </ul>
        </section>

        {/* Rights and Fairness */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">⚖️ Rights & Fairness</h3>
          <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-base">
            <li><strong>Rights of Party 1:</strong> {aiRawOutput.Rights_and_Fairness.Rights_of_Party_1}</li>
            <li><strong>Rights of Party 2:</strong> {aiRawOutput.Rights_and_Fairness.Rights_of_Party_2}</li>
            <li><strong>Fairness Check:</strong> {aiRawOutput.Rights_and_Fairness.Fairness_Check}</li>
          </ul>
        </section>

        {/* Applicable Laws and Acts */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📚 Applicable Laws & Acts</h3>
          <div className="mb-2">
            <div className="font-semibold text-sm text-gray-700">Explicit Acts:</div>
            <ul className="list-disc pl-6 text-neutral-700 text-base">
              {aiRawOutput.Applicable_Laws_and_Acts.Explicit_Acts.map((act, i) => (
                <li key={i}><strong>{act.Act}</strong>: {act.Relevance}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-700">Implicit Acts:</div>
            <ul className="list-disc pl-6 text-neutral-700 text-base">
              {aiRawOutput.Applicable_Laws_and_Acts.Implicit_Acts.map((act, i) => (
                <li key={i}><strong>{act.Act}</strong>: {act.Reason}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Risk and Compliance */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🚨 Risk & Compliance</h3>
          <ul className="list-disc pl-6 space-y-2 text-neutral-700 text-base">
            {aiRawOutput.Risk_and_Compliance.map((rc, i) => (
              <li key={i}><strong>Issue:</strong> {rc.Issue} <br /><strong>Recommendation:</strong> {rc.Recommendation}</li>
            ))}
          </ul>
        </section>

        {/* Simple Summary */}
        <div className="p-6 rounded-xl bg-gray-50 border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">🧾 Simple Summary</h3>
          <p className="text-gray-700 mt-2">{aiRawOutput.Simple_Summary}</p>
        </div>

        {/* Footer Branding (Web) */}
        <footer className="p-6 border-t border-gray-100 text-center text-xs text-neutral-400">
          Generated by <span className="font-semibold">Know Your Terms</span>
        </footer>
      </div>

      {/* Right: Score & Recommendations */}
      <div className="md:w-1/4 w-full flex-shrink-0">
        <div className="bg-white shadow rounded-2xl py-6 px-4 flex flex-col items-center mb-6 sticky top-28" style={{ minHeight: 340 }}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Confidence Score</h3>
          <CircularScore score={score} />
          <p className="text-gray-600 text-sm mt-2">This score reflects the AI's confidence in the accuracy of the extracted terms.</p>
          <div className="mt-6 w-full">
            <h4 className="text-base font-semibold text-gray-800 mb-2">Recommendations</h4>
            <div className="overflow-y-auto max-h-[35vh] border rounded-lg bg-gray-50">
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
};

export default StudentSummary;
