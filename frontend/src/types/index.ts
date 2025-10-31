// Shared types for agreement summaries
export interface BusinessClause {
  title: string;
  explanation: string;
  risk: string;
  improvement: string;
}

export interface BusinessOutput {
  Header: {
    Document_Name: string;
    Type: string;
    Purpose: string;
    Date: string;
    Jurisdiction: string;
  };
  Parties_Involved: {
    Party_1: string;
    Party_2: string;
    Relationship: string;
    Key_Obligations: string;
  };
  Overview: string;
  Clause_Insights: Array<{
    Topic: string;
    Explanation: string;
  }>;
  Key_Terms: {
    Duration: string;
    Payment_or_Consideration: string;
    Transfer_of_Rights: string;
    Termination: string;
  };
  Applicable_Laws: Array<{
    Act: string;
    Relevance: string;
  }>;
  Risk_and_Compliance: {
    Clause_Coverage_Percentage: string;
    Potential_Issues: Array<{
      Issue: string;
      Recommendation: string;
    }>;
  };
  Confidence_Score: string;
  Risk_Level: string;
  Recommendations: string[];
  Simple_Summary: string;
}

export interface StudentOutput {
  Category: string;
  Header: {
    Document_Name: string;
    Document_Type: string;
    Purpose: string;
    Date: string;
    Jurisdiction: string;
  };
  Parties_Involved: {
    Party_1: string;
    Party_2: string;
    Relationship: string;
    Key_Obligations: string;
  };
  Overview: string;
  Key_Terms: {
    Duration_or_Tenure: string;
    Stipend_or_Payment: string;
    Roles_and_Responsibilities: string;
    Termination_or_Exit_Clause: string;
    Ownership_or_IP: string;
    Confidentiality_or_NDA: string;
  };
  Rights_and_Fairness: {
    Rights_of_Party_1: string;
    Rights_of_Party_2: string;
    Fairness_Check: string;
  };
  Applicable_Laws_and_Acts: {
    Explicit_Acts: {
      Act: string;
      Relevance: string;
    }[];
    Implicit_Acts: {
      Act: string;
      Reason: string;
    }[];
  };
  Risk_and_Compliance: Array<{
    Issue: string;
    Recommendation: string;
  }>;
  Confidence_and_Risk_Score: {
    Confidence: string;
    Risk_Level: string;
    Document_Clarity: string;
  };
  Recommendations: string[];
  Simple_Summary: string;
}
export interface CitizenOutput {
  Category: string;
  Header: {
    Document_Name: string;
    Document_Type: string;
    Purpose: string;
    Date: string;
    Jurisdiction: string;
  };
  Parties_Involved: {
    Party_1: string;
    Party_2: string;
    Relationship: string;
    Key_Obligations: string;
  };
  Overview: string;
  Key_Terms: {
    Duration_or_Tenure: string;
    Payment_or_Consideration: string;
    Transfer_of_Rights: string;
    Termination_or_Cancellation: string;
    Witness_or_Attestation: string;
  };
  Rights_and_Obligations: {
    Rights_of_Party_1: string;
    Rights_of_Party_2: string;
    Mutual_Obligations: string;
  };
  Applicable_Laws_and_Acts: {
    Explicit_Acts: Array<{
      Act: string;
      Reason?: string;
      Section?: string;
      Relevance?: string;
    }>;
    Implicit_Acts: Array<{
      Act: string;
      Reason: string;
    }>;
  };
  Validation_Status: {
    Is_Legally_Compliant: string;
    Missing_Clauses: string[];
    Requires_Registration: string;
  };
  Risk_and_Compliance: Array<{
    Issue: string;
    Recommendation: string;
  }>;
  Confidence_and_Risk_Score: {
    Confidence: string;
    Risk_Level: string;
    Document_Clarity: string;
  };
  Recommendations: string[];
  Simple_Summary: string;
}
export interface User {
  name?: string;
  id: string;
  image?: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  roles?: ('USER' | 'ADMIN')[];
  userStatus?: 'active' | 'pending' | 'suspended'; // Account status
  providerId?: string;
  region?: string;
  language?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface AgreementSummary {
  file: File;
  uid: string;
  targetGroup: string;
}

export interface AgreementProcess {
  uid: string;
  processType: string;
}