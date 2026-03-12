import { FileText } from "lucide-react";
import React, { useState } from "react";
import type { StudentOutput } from "../../types";
import { mindmapGenerationAsync, videoGenerationAsync } from "../../store/agreementSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { toast } from "react-toastify";
import { MindMapModal } from "./MindMap";

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
}

const StudentSummary: React.FC<{ aiRawOutput: StudentOutput }> = ({ aiRawOutput }) => {
  // Score: use Confidence_and_Risk_Score.Confidence (out of 10)
  const dispatch = useAppDispatch();
  const score = parseInt(aiRawOutput.Confidence_and_Risk_Score.Confidence, 10) || 0;

  // Video loading and modal state
  const [videoStatus, setVideoStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');
  const [showVideoModal, setShowVideoModal] = React.useState(false);
  const [mindmapStatus, setMindmapStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');
  const [mindmapData, setMindmapData] = React.useState<any>(null);
  const [showMindMapModal, setShowMindMapModal] = React.useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const language = 'en';
  
  const handleVideoClick = async () => {

    if (videoStatus === 'idle' && user?.uid) {
      setVideoStatus('loading');

      try {
        const response = await dispatch(videoGenerationAsync({
          summary_text: JSON.stringify(aiRawOutput),
          category: 'student',
          uid: user.uid,
          language: language,
        })).unwrap();

        if (response?.statusCode === 200 || response?.success === true) {
          setVideoUrl(response.data.video_path);
          setVideoStatus('success');
          toast.success(response.message || "Video Generated successfully!");
        } else {
          toast.error(response?.message || "Failed to generate video");
          setVideoStatus('idle');
        }
      } catch (error) {
        console.error("Error generating video:", error);
        toast.error("Failed to generate video");
        setVideoStatus('idle');
      }


    }
  };

  const handleMindMapClick = async () => {

    if (mindmapStatus === 'idle' && user?.uid) {
      setMindmapStatus('loading');

      try {
        const response = await dispatch(mindmapGenerationAsync({
          summary_json: JSON.stringify(aiRawOutput),
          category: 'student',
          uid: user.uid,
        })).unwrap();
        console.log("response", response);
        if (response?.statusCode === 200 || response?.success === true) {
          setMindmapData(response.data);
          setMindmapStatus('success');
          toast.success(response.message || "Mindmap Generated successfully!");
        } else {
          toast.error(response?.message || "Failed to generate mindmap");
          setMindmapStatus('idle');
        }
      } catch (error) {
        console.error("Error generating mindmap:", error);
        toast.error("Failed to generate mindmap");
        setMindmapStatus('idle');
      }


    }
  };
  const handlePlayClick = () => {
    if (mindmapStatus === 'success') {
      setShowMindMapModal(true);
    } else {
      setShowVideoModal(true);
    }
  };
  const handleCloseModal = () => setShowVideoModal(false);

  return (
  <div className="max-w-7xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-0 flex flex-col md:flex-row h-[77.2vh]">
      {/* Left: Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-8 gap-0">
        {/* Fixed Header */}
        <header className={`border-b px-2 py-6 bg-white sticky top-0 flex flex-col gap-1${showVideoModal || showMindMapModal ? ' z-0' : ' z-10'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🎓 {aiRawOutput.Header.Document_Name}
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                📄 {aiRawOutput.Header.Document_Type} &mdash; 🗓️ {aiRawOutput.Header.Date} &mdash; 🌏 {aiRawOutput.Header.Jurisdiction}
              </div>
            </div>
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
              {(aiRawOutput.Applicable_Laws_and_Acts?.Explicit_Acts ?? []).map((act, i) => (
                <li key={i}><strong>{act.Act}</strong>: {act.Relevance}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-700">Implicit Acts:</div>
            <ul className="list-disc pl-6 text-neutral-700 text-base">
              {(aiRawOutput.Applicable_Laws_and_Acts?.Implicit_Acts ?? []).map((act, i) => (
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
            <div className="flex flex-col gap-6 w-full justify-center items-stretch">
              {/* Video Section - Minimal button/icon only */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-[80px] max-h-[80px]">
                {videoStatus === 'idle' && (
                  <button
                    className="bg-blue-100 text-blue-700 w-full px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-200 transition flex items-center justify-center gap-2"
                    onClick={handleVideoClick}
                    title="Generate Video"
                  >
                    <span role="img" aria-label="video" className="text-2xl">🎬</span>
                    Generate Video
                  </button>
                )}
                {videoStatus === 'loading' && (
                  <button
                    className="bg-blue-100 text-blue-700 w-full px-2 py-2 rounded-lg font-semibold shadow flex items-center justify-center gap-2"
                    disabled
                    title="Generating..."
                  >
                    <span role="img" aria-label="video" className="text-2xl">🎬</span>
                    Generating
                    <span className="ml-2">
                      <span className="inline-block align-middle"> 
                        <svg className="animate-spin h-6 w-6 text-blue-700" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      </span>
                    </span>
                  </button>
                )}
                {videoStatus === 'success' && (
                  <button
                    className="bg-blue-600 text-white w-full px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    onClick={handlePlayClick}
                    title="Play Video"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2563eb"/><polygon points="10,8 16,12 10,16" fill="#fff"/></svg>
                    Play Video
                  </button>
                )}
              </div>
              
              {/* Mind Map Section */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-[80px] max-h-[80px]">
                {mindmapStatus === 'idle' && (
                  <button
                    className="w-full px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-200 transition flex items-center justify-center gap-2 bg-green-100 text-neutral-800 border border-neutral-300"
                  
                    onClick={handleMindMapClick}
                    title="Generate Mind Map"
                  >
                     <span role="img" aria-label="mindmap" className="text-2xl">🧠</span>
                    Generate Mind Map
                  </button>
                )}
                {mindmapStatus === 'loading' && (
                  <button
                    className="w-full px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-00 transition flex items-center justify-center gap-2 bg-green-300 text-neutral-800 border border-neutral-300"
                    // className="bg-blue-100 text-blue-700 w-full px-2 py-2 rounded-lg font-semibold shadow flex items-center justify-center gap-2"
                    disabled
                    title="Generating..."
                  >
                    <span role="img" aria-label="mindmap" className="text-2xl">🧠</span>
                    Generating
                    <span className="ml-2">
                      <span className="inline-block align-middle"> 
                        <svg className="animate-spin h-6 w-6 text-green-700" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      </span>
                    </span>
                  </button>
                )}
                {mindmapStatus === 'success' && (
                  <button
                    className="w-full px-4 py-2 rounded-lg font-semibold shadow hover:bg-green-400 transition flex items-center justify-center gap-2 bg-green-300 text-gray-700 border border-neutral-300"
                    onClick={() => setShowMindMapModal(true)}
                    title="Open Mind Map"
                  >
                    <span role="img" aria-label="mindmap" className="text-2xl">🧠</span>
                    Open Mind Map
                  </button>
                )}
              </div>
              {/* Mind Map Modal Popup */}
              {showMindMapModal && (
                <MindMapModal 
                  isOpen={showMindMapModal}
                  onClose={() => setShowMindMapModal(false)}
                  mindmapData={mindmapData}
                />
              )}

            </div>

          {/* Video Modal Popup */}
          {showVideoModal && (
            <div className="fixed inset-0 z-[999] flex w-full items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl md:w-[90vw] lg:w-[70vw] aspect-video shadow-lg p-8 max-w-5xl w-full relative">
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
                  onClick={handleCloseModal}
                  aria-label="Close"
                >
                  &times;
                </button>
                <h2 className="text-lg font-semibold mb-4 text-blue-700 flex items-center gap-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2563eb"/><polygon points="10,8 16,12 10,16" fill="#fff"/></svg>
                  {aiRawOutput.Header.Document_Name} Video
                </h2>

                <video src={videoUrl} controls autoPlay className="w-full h-[25vh] md:h-[60vh] rounded-lg shadow" />
                <p className="text-sm text-gray-500 mt-1">
                    Powered by <span className="font-semibold text-[#F6A507]">Know Your Terms</span>
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSummary;
