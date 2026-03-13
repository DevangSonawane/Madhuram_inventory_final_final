import React from "react";
import { useParams } from "react-router-dom";
import ProjectSpreadsheet from "@/components/ProjectSpreadsheet";

export default function BillingInvoiceEditor() {
  const { projectId } = useParams();
  return <ProjectSpreadsheet projectId={projectId} title="Billing Invoice Workbook" />;
}

