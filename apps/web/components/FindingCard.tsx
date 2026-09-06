import React from "react";

export interface FindingProps {
  id: string;
  title: string;
  claim: string;
  severity: "critical" | "high" | "medium" | "low";
  path: string;
  line: number;
}

export const FindingCard: React.FC<FindingProps> = ({ title, claim, severity, path, line }) => {
  return (
    <div className={`finding-card severity-${severity}`}>
      <div className="finding-header">
        <span className="severity-chip">{severity.toUpperCase()}</span>
        <span className="file-location">{path}:{line}</span>
      </div>
      <h3>{title}</h3>
      <p>{claim}</p>
    </div>
  );
};
