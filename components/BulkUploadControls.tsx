"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import {
  downloadBulkErrorReport,
  downloadBulkTemplate,
  getBulkUploadStatus,
  uploadBulkFile,
} from "@/services/bulkUploadService";

type TemplateFormat = "excel" | "csv";

interface BulkUploadControlsProps {
  moduleKey: string;
}

const POLL_INTERVAL_MS = 3000;

const extractJobId = (payload: any): number | null => {
  const candidates = [
    payload?.jobId,
    payload?.data?.jobId,
    payload?.data?.id,
    payload?.id,
  ];

  const value = candidates.find((item) => item !== undefined && item !== null);
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toStatusText = (payload: any): string => {
  return String(
    payload?.status || payload?.data?.status || payload?.data?.state || "",
  ).toUpperCase();
};

const hasErrors = (payload: any): boolean => {
  const failedCount = Number(
    payload?.failedCount ||
      payload?.data?.failedCount ||
      payload?.data?.summary?.failedCount ||
      0,
  );
  return failedCount > 0 || toStatusText(payload) === "FAILED";
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const BulkUploadControls: React.FC<BulkUploadControlsProps> = ({ moduleKey }) => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [format, setFormat] = useState<TemplateFormat>("excel");
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [polling, setPolling] = useState(false);
  const [errorReportAvailable, setErrorReportAvailable] = useState(false);
  const [downloadingErrorReport, setDownloadingErrorReport] = useState(false);

  const normalizedModule = useMemo(() => moduleKey?.trim(), [moduleKey]);

  useEffect(() => {
    if (!jobId) return;

    let isActive = true;
    setPolling(true);

    const interval = setInterval(async () => {
      try {
        const response = await getBulkUploadStatus(jobId);
        if (!isActive) return;

        const status = toStatusText(response);
        if (hasErrors(response)) {
          setErrorReportAvailable(true);
        }

        if (["COMPLETED", "SUCCESS", "FAILED", "PARTIAL_SUCCESS"].includes(status)) {
          clearInterval(interval);
          setPolling(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("bulk-upload-completed", {
                detail: {
                  moduleKey: normalizedModule,
                  jobId,
                  status,
                },
              }),
            );
          }
          if (status === "FAILED") {
            toast.error(`Bulk upload failed for ${normalizedModule}`);
          } else {
            toast.success(`Bulk upload finished for ${normalizedModule}`);
          }
        }
      } catch (error) {
        clearInterval(interval);
        setPolling(false);
        console.error("Error polling bulk upload status:", error);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [jobId, normalizedModule]);

  const onTemplateDownload = async () => {
    if (!normalizedModule) {
      toast.error("Module key missing for bulk template");
      return;
    }

    try {
      setDownloadingTemplate(true);
      const blob = await downloadBulkTemplate(normalizedModule, format);
      const ext = format === "excel" ? "xlsx" : "csv";
      downloadBlobFile(blob, `${normalizedModule}_template.${ext}`);
    } catch (error) {
      console.error("Template download failed:", error);
      toast.error("Failed to download bulk template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const onPickFile = () => {
    if (!normalizedModule) {
      toast.error("Module key missing for bulk upload");
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !normalizedModule) return;

    try {
      setUploading(true);
      setErrorReportAvailable(false);
      const response = await uploadBulkFile(normalizedModule, file);
      const nextJobId = extractJobId(response);
      if (!nextJobId) {
        toast.error("Upload done but job id not returned");
        return;
      }

      setJobId(nextJobId);
      toast.success(`Bulk upload started (Job #${nextJobId})`);
    } catch (error) {
      console.error("Bulk upload failed:", error);
      toast.error("Failed to upload bulk file");
    } finally {
      setUploading(false);
    }
  };

  const onErrorReportDownload = async () => {
    if (!jobId) return;

    try {
      setDownloadingErrorReport(true);
      const blob = await downloadBulkErrorReport(jobId);
      downloadBlobFile(blob, `${normalizedModule}_error_report_${jobId}.csv`);
    } catch (error) {
      console.error("Error report download failed:", error);
      toast.error("Failed to download error report");
    } finally {
      setDownloadingErrorReport(false);
    }
  };

  if (!normalizedModule) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="relative">
        <select
          value={format}
          onChange={(event) => setFormat(event.target.value as TemplateFormat)}
        className={`appearance-none pl-2.5 pr-8 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm border ${
          isDark
            ? "bg-gray-800 border-gray-700 text-gray-300"
            : "bg-white border-gray-300 text-gray-700"
        }`}
        >
          <option value="excel">Excel</option>
          <option value="csv">CSV</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <button
        onClick={onTemplateDownload}
        disabled={downloadingTemplate || uploading}
        className={`cursor-pointer px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border disabled:opacity-60 ${
          isDark
            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Template
      </button>

      <button
        onClick={onPickFile}
        disabled={uploading || downloadingTemplate}
        className={`cursor-pointer px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border disabled:opacity-60 ${
          isDark
            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {polling && (
        <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Checking status...
        </span>
      )}

      {errorReportAvailable && jobId && (
        <button
        onClick={onErrorReportDownload}
        disabled={downloadingErrorReport}
        className={`cursor-pointer px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border disabled:opacity-60 ${
          isDark
            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Errors
        </button>
      )}
    </div>
  );
};

export default BulkUploadControls;
