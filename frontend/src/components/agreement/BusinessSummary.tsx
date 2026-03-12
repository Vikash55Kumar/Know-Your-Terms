
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import type { BusinessOutput as ImportedBusinessOutput } from '../../types';
import { mindmapGenerationAsync, videoGenerationAsync } from '../../store/agreementSlice';
import { toast } from 'react-toastify';
import { MindMapModal } from './MindMap';

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

const BusinessSummary: React.FC<{ aiRawOutput: ImportedBusinessOutput }> = ({ aiRawOutput }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [videoStatus, setVideoStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [mindmapStatus, setMindmapStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');
  const [mindmapData, setMindmapData] = React.useState<any>(null);
  const [showMindMapModal, setShowMindMapModal] = React.useState(false);
  const language = 'en';
  
  const handleVideoClick = async () => {
    if (videoStatus === 'idle' && user?.uid) {
      setVideoStatus('loading');
      try {
        const response = await dispatch(videoGenerationAsync({
            summary_text: JSON.stringify(aiRawOutput),
            category: 'business',
            uid: user.uid,
            language: language,
          })
        ).unwrap();
        if (response?.statusCode === 200 || response?.success === true) {
          setVideoUrl(response.data.video_path);
          setVideoStatus('success');
        } else {
          setVideoStatus('idle');
        }
      } catch (error) {
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
          category: 'business',
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

  const handlePlayClick = () => setShowVideoModal(true);
  const handleCloseModal = () => setShowVideoModal(false);

  // Defensive: get title if present and is a string
  const summaryTitle = typeof (aiRawOutput as any).title === 'string' && (aiRawOutput as any).title
    ? (aiRawOutput as any).title
    : 'Business Contract Summary';
  return (
    <div className="relative flex flex-col md:flex-row max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-col gap-0 w-full">
        {/* Fixed Title */}
        <header className={`border-b px-2 py-6 bg-white sticky top-0 flex flex-col gap-1${showVideoModal || showMindMapModal ? ' z-0' : ' z-10'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🎓 {aiRawOutput.Header.Document_Name}
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                📄 {aiRawOutput.Header.Type} &mdash; 🗓️ {aiRawOutput.Header.Date} &mdash; 🌏 {aiRawOutput.Header.Jurisdiction}
              </div>
            </div>
          </div>
        </header>
        {/* Left: Scrollable Content */}
        <div className="w-full">
          <div className="bg-white rounded-2xl p-8 space-y-10 max-h-[600px] overflow-y-auto">
            
            {/* Overview */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">📝 Overview</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{aiRawOutput.Overview}</p>
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

            {/* Clause Insights */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">📑 Clause Insights</h3>
              <div className="space-y-6">
                {aiRawOutput.Clause_Insights.map((clause, i) => (
                  <div key={i} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-800">{clause.Topic}</h4>
                    <p className="text-gray-600 text-sm mb-3">{clause.Explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Terms */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🔑 Key Terms</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                <li><b>Duration:</b> {aiRawOutput.Key_Terms.Duration}</li>
                <li><b>Payment/Consideration:</b> {aiRawOutput.Key_Terms.Payment_or_Consideration}</li>
                <li><b>Transfer of Rights:</b> {aiRawOutput.Key_Terms.Transfer_of_Rights}</li>
                <li><b>Termination:</b> {aiRawOutput.Key_Terms.Termination}</li>
              </ul>
            </div>

            {/* Applicable Laws */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">⚖️ Applicable Laws</h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                {aiRawOutput.Applicable_Laws.map((law, i) => (
                  <li key={i}><b>{law.Act}:</b> {law.Relevance}</li>
                ))}
              </ul>
            </div>

            {/* Risk and Compliance */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🛡️ Risk & Compliance</h3>
              <p className="mb-2"><b>Clause Coverage:</b> {aiRawOutput.Risk_and_Compliance.Clause_Coverage_Percentage}</p>
              <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                {aiRawOutput.Risk_and_Compliance.Potential_Issues.map((issue, i) => (
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
          <CircularScore score={parseInt(aiRawOutput.Confidence_Score, 10) || 0} />
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

              {/* Mind Map Button */}
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
                    className="w-full px-4 py-2 rounded-lg font-semibold shadow transition flex items-center justify-center gap-2 bg-green-200 text-neutral-800 border border-neutral-300"
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
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2563eb"/><polygon points="10,8 16,12 10,16" fill="#fff"/></svg>
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

export default BusinessSummary;

