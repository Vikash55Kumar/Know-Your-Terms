import { useState } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CitizenSummary from "../../../components/agreement/CitizenSummary";
import BusinessSummary from "../../../components/agreement/BusinessSummary";
import StudentSummary from "../../../components/agreement/StudentSummary";

// Use shared types
import type { BusinessOutput, CitizenOutput, StudentOutput } from "../../../types";
import { generateCitizenPDF } from "../../../components/pdf/citizenPdf";
import { generateBusinessPDF } from "../../../components/pdf/bussinessPdf";
import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { agreementSummaryAsync } from "../../../store/agreementSlice";
import { toast } from "react-toastify";
import Button from "../../../components/common/Button";
import { generateStudentPDF } from "../../../components/pdf/studentPdf";
import { useTranslation } from 'react-i18next';

type Props = {
  targetGroup: "citizen" | "student" | "business_owner";
};

// Types for each summary output

type SummaryUnion =
  | ({ type: "citizen" } & CitizenOutput)
  | ({ type: "student" } & StudentOutput)
  | ({ type: "business_owner" } & BusinessOutput);


export default function SummaryPage({ targetGroup }: Props) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [summary, setSummary] = useState<SummaryUnion | null>(null);
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(true);
    const { user } = useAppSelector((state) => state.auth);
    const { t } = useTranslation();
    const targetGroupLabel: Record<Props["targetGroup"], string> = {
        citizen: t('summaryPage.targetGroupLabels.citizen'),
        student: t('summaryPage.targetGroupLabels.student'),
        business_owner: t('summaryPage.targetGroupLabels.business_owner'),
    };

    console.log("Rendering SummaryPage with targetGroup:", summary);

    const language = "en";

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            toast.error("Please select a file to upload.");
            return;
        }
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        if (!user || !user.uid) {
            toast.error("You must be logged in to upload and summarize a document.");
            return;
        }
        if (!targetGroup) {
            toast.error("Target group is missing. Please select your role again.");
            return;
        }

        setLoading(true);
        setSummary(null);
        setShowUpload(false);

        try {
            const response = await dispatch(agreementSummaryAsync({
                file: selectedFile,
                uid: user.uid,
                targetGroup: targetGroup,
                language: language,
            })).unwrap();
            if (response?.statusCode === 200 || response?.success === true) {
                setSummary({
                    type: targetGroup,
                    ...response.data.DocumentSummary,
                });
                setLoading(false);
                toast.success(response.message || "Document summarized successfully!");
            } else {
                toast.error(response?.message || "Failed to generate summary");
                setLoading(false);
                setShowUpload(true);
            }
        } catch {
            toast.error("Failed to summarize the document. Please try again later.");
            setLoading(false);
            setShowUpload(true);
        } finally {
            setLoading(false);
        }
    };

    const handleAskWithAgent = async () => {
        if (!summary) return;
        
        try {
            // Create a formatted summary text for the agent
            let summaryText = "";
            if (summary.type === "citizen") {
                                                                                                                                                                                                               summaryText = `Document Analysis Summary:
Category: Citizen
Header:
  Document Name: ${summary.Header.Document_Name}
  Document Type: ${summary.Header.Document_Type}
  Purpose: ${summary.Header.Purpose}
  Date: ${summary.Header.Date}
  Jurisdiction: ${summary.Header.Jurisdiction}
Parties Involved:
  Party 1: ${summary.Parties_Involved.Party_1}
  Party 2: ${summary.Parties_Involved.Party_2}
  Relationship: ${summary.Parties_Involved.Relationship}
  Key Obligations: ${summary.Parties_Involved.Key_Obligations}
Overview: ${summary.Overview}
Key Terms:
  Duration/Tenure: ${summary.Key_Terms.Duration_or_Tenure}
  Payment/Consideration: ${summary.Key_Terms.Payment_or_Consideration}
  Transfer of Rights: ${summary.Key_Terms.Transfer_of_Rights}
  Termination/Cancellation: ${summary.Key_Terms.Termination_or_Cancellation}
  Witness/Attestation: ${summary.Key_Terms.Witness_or_Attestation}
Rights and Obligations:
  Rights of Party 1: ${summary.Rights_and_Obligations.Rights_of_Party_1}
  Rights of Party 2: ${summary.Rights_and_Obligations.Rights_of_Party_2}
  Mutual Obligations: ${summary.Rights_and_Obligations.Mutual_Obligations}
Applicable Laws and Acts:
  Explicit Acts: ${(summary.Applicable_Laws_and_Acts.Explicit_Acts && summary.Applicable_Laws_and_Acts.Explicit_Acts.length > 0) ? summary.Applicable_Laws_and_Acts.Explicit_Acts.map(act => `${act.Act} (${act.Section}): ${act.Relevance}`).join("; ") : "None"}
  Implicit Acts: ${(summary.Applicable_Laws_and_Acts.Implicit_Acts && summary.Applicable_Laws_and_Acts.Implicit_Acts.length > 0) ? summary.Applicable_Laws_and_Acts.Implicit_Acts.map(act => `${act.Act}: ${act.Reason}`).join("; ") : "None"}
Validation Status:
  Legally Compliant: ${summary.Validation_Status.Is_Legally_Compliant}
  Missing Clauses: ${(summary.Validation_Status.Missing_Clauses && summary.Validation_Status.Missing_Clauses.length > 0) ? summary.Validation_Status.Missing_Clauses.join(", ") : "None"}
  Requires Registration: ${summary.Validation_Status.Requires_Registration}
Risk and Compliance:
${(summary.Risk_and_Compliance && summary.Risk_and_Compliance.length > 0) ? summary.Risk_and_Compliance.map(risk => `  Issue: ${risk.Issue}\n  Recommendation: ${risk.Recommendation}`).join("\n") : "  None"}
Confidence and Risk Score:
  Confidence: ${summary.Confidence_and_Risk_Score.Confidence}
  Risk Level: ${summary.Confidence_and_Risk_Score.Risk_Level}
  Document Clarity: ${summary.Confidence_and_Risk_Score.Document_Clarity}
Recommendations:
${(summary.Recommendations && summary.Recommendations.length > 0) ? summary.Recommendations.map(r => `  - ${r}`).join("\n") : "  None"}
Simple Summary: ${summary.Simple_Summary}`;
            } else if (summary.type === "student") {
                summaryText = `Document Analysis Summary:
Category: Student
Header:
  Document Name: ${summary.Header.Document_Name}
  Document Type: ${summary.Header.Document_Type}
  Purpose: ${summary.Header.Purpose}
  Date: ${summary.Header.Date}
  Jurisdiction: ${summary.Header.Jurisdiction}
Parties Involved:
  Party 1: ${summary.Parties_Involved.Party_1}
  Party 2: ${summary.Parties_Involved.Party_2}
  Relationship: ${summary.Parties_Involved.Relationship}
  Key Obligations: ${summary.Parties_Involved.Key_Obligations}
Overview: ${summary.Overview}
Key Terms:
  Duration/Tenure: ${summary.Key_Terms.Duration_or_Tenure}
  Stipend/Payment: ${summary.Key_Terms.Stipend_or_Payment}
  Roles and Responsibilities: ${summary.Key_Terms.Roles_and_Responsibilities}
  Termination/Exit Clause: ${summary.Key_Terms.Termination_or_Exit_Clause}
  Ownership/IP: ${summary.Key_Terms.Ownership_or_IP}
  Confidentiality/NDA: ${summary.Key_Terms.Confidentiality_or_NDA}
Rights and Fairness:
  Rights of Party 1: ${summary.Rights_and_Fairness.Rights_of_Party_1}
  Rights of Party 2: ${summary.Rights_and_Fairness.Rights_of_Party_2}
  Fairness Check: ${summary.Rights_and_Fairness.Fairness_Check}
Applicable Laws and Acts:
  Explicit Acts: ${(summary.Applicable_Laws_and_Acts.Explicit_Acts && summary.Applicable_Laws_and_Acts.Explicit_Acts.length > 0) ? summary.Applicable_Laws_and_Acts.Explicit_Acts.map(act => `${act.Act}: ${act.Relevance}`).join("; ") : "None"}
  Implicit Acts: ${(summary.Applicable_Laws_and_Acts.Implicit_Acts && summary.Applicable_Laws_and_Acts.Implicit_Acts.length > 0) ? summary.Applicable_Laws_and_Acts.Implicit_Acts.map(act => `${act.Act}: ${act.Reason}`).join("; ") : "None"}
Risk and Compliance:
${(summary.Risk_and_Compliance && summary.Risk_and_Compliance.length > 0) ? summary.Risk_and_Compliance.map(risk => `  Issue: ${risk.Issue}\n  Recommendation: ${risk.Recommendation}`).join("\n") : "  None"}
Confidence and Risk Score:
  Confidence: ${summary.Confidence_and_Risk_Score.Confidence}
  Risk Level: ${summary.Confidence_and_Risk_Score.Risk_Level}
  Document Clarity: ${summary.Confidence_and_Risk_Score.Document_Clarity}
Recommendations:
${(summary.Recommendations && summary.Recommendations.length > 0) ? summary.Recommendations.map(r => `  - ${r}`).join("\n") : "  None"}
Simple Summary: ${summary.Simple_Summary}`;
            } else if (summary.type === "business_owner") {
                summaryText = `Document Analysis Summary:
Category: Business Owner
Header:
  Document Name: ${summary.Header.Document_Name}
  Type: ${summary.Header.Type}
  Purpose: ${summary.Header.Purpose}
  Date: ${summary.Header.Date}
  Jurisdiction: ${summary.Header.Jurisdiction}
Parties Involved:
  Party 1: ${summary.Parties_Involved.Party_1}
  Party 2: ${summary.Parties_Involved.Party_2}
  Relationship: ${summary.Parties_Involved.Relationship}
  Key Obligations: ${summary.Parties_Involved.Key_Obligations}
Overview: ${summary.Overview}
Clause Insights:
${(summary.Clause_Insights && summary.Clause_Insights.length > 0) ? summary.Clause_Insights.map(clause => `  - ${clause.Topic}: ${clause.Explanation}`).join("\n") : "  None"}
Key Terms:
  Duration: ${summary.Key_Terms.Duration}
  Payment/Consideration: ${summary.Key_Terms.Payment_or_Consideration}
  Transfer of Rights: ${summary.Key_Terms.Transfer_of_Rights}
  Termination: ${summary.Key_Terms.Termination}
Applicable Laws:
${(summary.Applicable_Laws && summary.Applicable_Laws.length > 0) ? summary.Applicable_Laws.map(law => `  - ${law.Act}: ${law.Relevance}`).join("\n") : "  None"}
Risk and Compliance:
  Clause Coverage: ${summary.Risk_and_Compliance.Clause_Coverage_Percentage}
${(summary.Risk_and_Compliance.Potential_Issues && summary.Risk_and_Compliance.Potential_Issues.length > 0) ? summary.Risk_and_Compliance.Potential_Issues.map(issue => `  Issue: ${issue.Issue}\n  Recommendation: ${issue.Recommendation}`).join("\n") : "  None"}
Confidence Score: ${summary.Confidence_Score}
Risk Level: ${summary.Risk_Level}
Recommendations:
${(summary.Recommendations && summary.Recommendations.length > 0) ? summary.Recommendations.map(r => `  - ${r}`).join("\n") : "  None"}
Simple Summary: ${summary.Simple_Summary}`;
            }
            
            // Navigate to agent chat with summary data
            navigate(`/agent/chat?summary=${encodeURIComponent(summaryText)}`);
        } catch (error) {
            console.error('Error navigating to agent:', error);
            toast.error('Failed to open agent chat. Please try again.');
        }
    };

    // ✅ Render summary based on targetGroup
    const renderSummary = () => {
        if (!summary) return null;
        switch (targetGroup) {
        case "citizen":
            return <CitizenSummary aiRawOutput={summary as CitizenOutput} />;
        case "student":
            return <StudentSummary aiRawOutput={summary as StudentOutput} />;
        case "business_owner":
            return <BusinessSummary aiRawOutput={summary as BusinessOutput} />;
        default:
            return null;
        }
    };

    return (
        <motion.div
            className="min-h-screen max-w-7xl mx-auto p-6 space-y-6 mt-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-black flex items-center justify-center gap-2 tracking-tight">
                    📄 {targetGroupLabel[targetGroup]}
                </h1>
                <p className="text-gray-800 text-lg mt-2">
                    {t('summaryPage.header.subtitle')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    {t('summaryPage.header.powered_by')} <span className="font-semibold text-[#F6A507]">Know Your Terms</span>
                </p>
                <div className="mt-4 w-16 border-b-2 border-[#CDA047] mx-auto"></div>
            </header>


            {/* Upload Box (show only if showUpload is true and not loading) */}
            {showUpload && !loading && (
                <>
                    <div className="max-w-6xl mx-auto border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 transition bg-white">
                        <div className="flex flex-col items-center justify-center p-10">
                            <Upload className="w-10 h-10 text-gray-500 mb-4" />
                            <p className="text-gray-700 mb-2">
                                {file ? file.name : t('summaryPage.upload.placeholder')}
                            </p>
                            <p className="text-gray-700 mb-2">
                                {t('summaryPage.upload.supported_formats')}
                            </p>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer px-4 py-2 mt-2 rounded-md bg-gradient-to-br from-[#e5e7eb] via-[#f3f4f6] to-[#f9fafb] text-gray-800 hover:bg-[#e0e7ef] focus:ring-[#b1b4b6] border border-[#b1b4b6] hover:from-[#e0e7ef] hover:via-[#f3f4f6] hover:to-[#f9fafb]"
                            >
                                {t('summaryPage.upload.button')}
                            </label>
                        </div>
                    </div>

                    {/* Example Uploaded Document based on role */}
                    <div className="max-w-6xl mx-auto mt-4">
                        <p className="text-gray-700 font-medium mb-1">{t('summaryPage.examples.title')}</p>
                        {targetGroup === "citizen" && (
                            <ul className="text-gray-600 text-sm list-disc pl-5">
                                {((t('summaryPage.examples.citizen', { returnObjects: true }) as unknown) as string[]).map((ex: string, i: number) => (
                                    <li key={i}>{ex}</li>
                                ))}
                            </ul>
                        )}
                        {targetGroup === "student" && (
                            <ul className="text-gray-600 text-sm list-disc pl-5">
                                {((t('summaryPage.examples.student', { returnObjects: true }) as unknown) as string[]).map((ex: string, i: number) => (
                                    <li key={i}>{ex}</li>
                                ))}
                            </ul>
                        )}
                        {targetGroup === "business_owner" && (
                            <ul className="text-gray-600 text-sm list-disc pl-5">
                                {((t('summaryPage.examples.business_owner', { returnObjects: true }) as unknown) as string[]).map((ex: string, i: number) => (
                                    <li key={i}>{ex}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
            {/* Re-upload Button (show only if summary is present and not loading) */}
            {summary && !loading && !showUpload && (
                <div className="flex justify-center">
                    <Button
                        onClick={() => {
                            setShowUpload(true);
                            setSummary(null);
                            setFile(null);
                        }}
                    >
                        {t('summaryPage.reupload')}
                    </Button>
                </div>
            )}

            {/* Loader Section */}
            {loading && (
                <div className="flex flex-col max-w-6xl mx-auto border border-gray-200 rounded-lg bg-white items-center justify-center py-10">
                    <svg className="animate-spin h-10 w-10 text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <p className="text-gray-700 font-medium">{t('summaryPage.loader')}</p>
                </div>
            )}

            {/* Warning / Invalid Doc */}
            {!file && !loading && (
                <div className="flex max-w-6xl mx-auto items-center text-yellow-600 bg-yellow-50 p-3 rounded-lg shadow-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <p className="text-sm">
                        {t('summaryPage.warning_no_file')}
                    </p>
                </div>
            )}

            {/* Summary Section */}
            {!loading && renderSummary()}

            {/* Action Buttons */}
            {summary && !loading && (
                <div className="flex max-w-6xl mx-auto gap-4 mt-6">
                    <button
                        onClick={() => {
                            if (summary.type === "business_owner") {
                                generateBusinessPDF(summary);
                            } else if (summary.type === "citizen") {
                                generateCitizenPDF(summary);
                            } else if (summary.type === "student") {
                                generateStudentPDF(summary);
                            } else {
                                alert(t('summaryPage.actions.pdf_unavailable'));
                            }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
                    >
                        {t('summaryPage.actions.download_pdf')}
                    </button>
                    <button
                        onClick={() =>
                            navigator.share
                                    ? navigator.share({
                                        title: t('summaryPage.actions.share_title'),
                                        text: t('summaryPage.actions.share_text'),
                                        url: window.location.href,
                                    })
                                    : alert(t('summaryPage.actions.share'))
                        }
                        className="border px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors"
                    >
                        Share
                    </button>

                    {/* Pass summary data to agent */}
                    <button
                        onClick={handleAskWithAgent}
                        className="border px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition-colors"
                    >
                        {t('summaryPage.actions.ask_agent')}
                    </button>
                </div>
            )}
        </motion.div>
    );
}
