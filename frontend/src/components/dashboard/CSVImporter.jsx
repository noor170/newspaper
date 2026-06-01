import { useCallback, useRef, useState } from "react";
import { INVENTORY_IMPORT_ENDPOINT } from "../../constants/api";

function formatApiError(payload, fallback) {
  if (!payload?.detail) return fallback;
  const { detail } = payload;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "string" ? item : item?.msg || JSON.stringify(item)))
      .join(" ");
  }
  return fallback;
}

export default function CSVImporter({ onImportSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  const uploadFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setSuccessMessage("");
        setErrorMessage("Only .csv files are accepted.");
        return;
      }

      setIsUploading(true);
      setSuccessMessage("");
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(INVENTORY_IMPORT_ENDPOINT, {
          method: "POST",
          body: formData,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            formatApiError(payload, `Upload failed with HTTP ${response.status}.`)
          );
        }

        setSuccessMessage(payload?.message || "Inventory CSV imported successfully.");
        if (onImportSuccess) onImportSuccess(payload);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [onImportSuccess]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragging(false);
      const droppedFile = event.dataTransfer.files?.[0];
      uploadFile(droppedFile);
    },
    [uploadFile]
  );

  const handleInputChange = useCallback(
    (event) => {
      const selectedFile = event.target.files?.[0];
      uploadFile(selectedFile);
      event.target.value = "";
    },
    [uploadFile]
  );

  return (
    <section className="panel csv-import-panel">
      <div className="subpanel-header">
        <div>
          <h4>Inventory CSV Import</h4>
          <p>Drop a CSV file to bulk insert inventory records into the database.</p>
        </div>
      </div>

      <div
        className={`csv-drop-zone ${isDragging ? "csv-drop-zone-active" : ""} ${
          isUploading ? "csv-drop-zone-disabled" : ""
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <p className="csv-drop-title">Drag & drop your .csv file here</p>
        <p className="csv-drop-subtitle">or choose file manually</p>
        <button
          type="button"
          className="csv-import-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Select CSV File"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          hidden
        />
      </div>

      {isUploading && <div className="csv-upload-status">Processing upload, please wait...</div>}
      {successMessage && <div className="csv-alert csv-alert-success">{successMessage}</div>}
      {errorMessage && <div className="csv-alert csv-alert-error">{errorMessage}</div>}
    </section>
  );
}
