import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProjectSpreadsheet from "@/components/ProjectSpreadsheet";
import { Button } from "@/components/ui/button";

export default function BillingInvoiceEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const backHref = projectId ? `/${projectId}/billing` : "/billing";

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="absolute left-4 top-4 z-50">
        <Button variant="outline" onClick={() => navigate(backHref)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="h-full w-full pt-0">
        <ProjectSpreadsheet
          projectId={projectId}
          title="Billing Invoice Workbook"
          workbookTitle="Madhuram Sheet"
          showHeader={false}
          showDownload
          wrapperClassName="h-full w-full"
          bodyClassName="relative h-full w-full"
        />
      </div>
    </div>
  );
}
