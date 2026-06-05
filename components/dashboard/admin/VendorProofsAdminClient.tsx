"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProofRow = {
  id: string;
  status: string;
  submittedAt?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  rejectionReason?: string | null;
  vendor: {
    id: number;
    name: string;
    email: string;
  };
  assignment: {
    id: string;
    status: string;
    lead?: {
      id: number;
      customerName: string;
      email?: string | null;
    } | null;
  };
  inventoryHoarding: {
    id: number;
    inventoryCode?: string | null;
    outletName: string;
    locationName: string;
    city?: string | null;
    district?: string | null;
    state?: string | null;
  };
  media: Array<{
    id: string;
    type: "PHOTO" | "VIDEO";
    url: string;
    fileName: string;
  }>;
};

export default function VendorProofsAdminClient({
  proofs,
}: {
  proofs: ProofRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    outletName: string;
    location: string;
    latitude: number;
    longitude: number;
    submittedAt?: string | null;
  } | null>(null);
  const [isPdfSelectorOpen, setIsPdfSelectorOpen] = useState(false);
  const [currentProofForPdf, setCurrentProofForPdf] = useState<ProofRow | null>(null);
  const [selectedPhotosForPdf, setSelectedPhotosForPdf] = useState<string[]>([]);

  const generatePdf = (proof: ProofRow, selectedUrls: string[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download the PDF report.");
      return;
    }

    const videoMedia = proof.media.find((m) => m.type === "VIDEO");
    const videoLinkHtml = videoMedia
      ? `<div class="video-box">
          <strong>Video Proof:</strong> 
          <a href="${videoMedia.url}" target="_blank">${videoMedia.url}</a>
         </div>`
      : `<div class="video-box no-video"><strong>Video Proof:</strong> No Video Proof Uploaded</div>`;

    const locationStr = [
      proof.inventoryHoarding.locationName,
      proof.inventoryHoarding.city || proof.inventoryHoarding.district,
      proof.inventoryHoarding.state,
    ]
      .filter(Boolean)
      .join(", ");

    const formattedDate = proof.submittedAt ? (() => {
      try {
        const date = new Date(proof.submittedAt);
        const formattedHi = date.toLocaleString("hi-IN", {
          weekday: 'long',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `${formattedHi} GMT +05:30`;
      } catch (e) {
        return new Date(proof.submittedAt).toLocaleString("en-IN") + " GMT +05:30";
      }
    })() : "-";

    const imagesHtml = selectedUrls
      .map(
        (url, idx) => `
        <div class="image-cell">
          <img src="${url}" alt="Proof Image" />
          <div class="image-tag">Proof Photo 0${idx + 1}</div>
          
          <div class="gps-watermark">
            <div class="map-box">
              <img
                src="/images/map_placeholder.png"
                alt="Map"
                style="width: 100%; height: 100%; object-fit: cover; display: block;"
              />
            </div>
            <div class="info-box">
              <h4 class="info-title">${proof.inventoryHoarding.outletName || "Outlet Location"}</h4>
              <p class="info-text">${locationStr || "Address not available"}</p>
              <p class="info-mono">Lat ${Number(proof.latitude).toFixed(6)}° Long ${Number(proof.longitude).toFixed(6)}°</p>
              <p class="info-date">${formattedDate}</p>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>POP_Report_${proof.inventoryHoarding.inventoryCode || proof.id}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              background-color: #ffffff;
            }
            .report-page {
              display: flex;
              flex-direction: column;
              height: 100%;
              max-height: 246mm;
              justify-content: space-between;
              overflow: hidden;
            }
            @media print {
              html, body {
                height: 100%;
                overflow: hidden;
              }
              .report-page {
                height: 100%;
                max-height: 246mm;
                overflow: hidden;
              }
            }
            .header-banner {
              background-color: #002147;
              color: #ffffff;
              padding: 14px 20px;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 800;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .report-tag {
              font-size: 10px;
              font-weight: 700;
              background-color: rgba(255, 255, 255, 0.15);
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-gap: 8px;
              margin-bottom: 12px;
            }
            .info-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 12px;
            }
            .info-label {
              font-size: 9px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 3px;
              letter-spacing: 0.5px;
            }
            .info-value {
              font-size: 12px;
              font-weight: 600;
              color: #0f172a;
              line-height: 1.25;
            }
            .video-box {
              background-color: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 12px;
              font-size: 12px;
              display: flex;
              align-items: center;
              gap: 8px;
              color: #166534;
            }
            .video-box strong {
              color: #14532d;
            }
            .video-box a {
              color: #15803d;
              text-decoration: underline;
              word-break: break-all;
            }
            .video-box.no-video {
              background-color: #fff7ed;
              border-color: #ffedd5;
              color: #9a3412;
            }
            .video-box.no-video strong {
              color: #7c2d12;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              grid-gap: 12px;
              width: 100%;
              margin-bottom: 12px;
            }
            .image-cell {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              background-color: #ffffff;
              position: relative;
              box-shadow: 0 1px 2px rgba(0,0,0,0.03);
              aspect-ratio: 4/3;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .image-cell img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              background-color: #fafafa;
              display: block;
            }
            .image-tag {
              position: absolute;
              top: 8px;
              left: 8px;
              background: rgba(0, 33, 71, 0.85);
              color: #ffffff;
              font-size: 9px;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 4px;
              letter-spacing: 0.5px;
              z-index: 15;
            }
            .gps-watermark {
              position: absolute;
              bottom: 6px;
              left: 6px;
              right: 6px;
              display: flex;
              align-items: flex-end;
              gap: 5px;
              pointer-events: none;
              z-index: 10;
            }
            .map-box {
              width: 68px;
              height: 68px;
              border-radius: 6px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.25);
              flex-shrink: 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              background-color: #18181b;
            }
            .map-box iframe {
              width: 100%;
              height: 100%;
              border: none;
              transform: scale(1.1);
            }
            .info-box {
              flex: 1;
              background-color: rgba(0, 0, 0, 0.65) !important;
              backdrop-filter: blur(2px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 6px;
              padding: 4px 6px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              display: flex;
              flex-direction: column;
              text-align: left;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-title {
              font-size: 7.5px;
              font-weight: 800;
              color: #ffffff !important;
              margin: 0 0 1px 0;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-text {
              font-size: 6.5px;
              color: #e4e4e7 !important;
              margin: 0 0 1px 0;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-mono {
              font-family: monospace;
              font-size: 6px;
              color: #d4d4d8 !important;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-date {
              font-size: 6px;
              font-weight: 600;
              color: #d4d4d8 !important;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              font-size: 8.5px;
              color: #94a3b8;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="report-page">
            <div>
              <div class="header-banner">
                <h1 class="brand-title">Moksh Promotion</h1>
                <span class="report-tag">Proof of Performance</span>
              </div>

              <div class="info-grid">
                <div class="info-card">
                  <div class="info-label">Outlet Name</div>
                  <div class="info-value" style="color: #002147; font-weight: 700;">${proof.inventoryHoarding.outletName}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Site ID</div>
                  <div class="info-value" style="color: #002147; font-weight: 700;">${proof.inventoryHoarding.inventoryCode || "-"}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Vendor</div>
                  <div class="info-value">${proof.vendor.name}</div>
                </div>
                <div class="info-card" style="grid-column: span 2;">
                  <div class="info-label">Location</div>
                  <div class="info-value">${locationStr || "-"}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">GPS Coordinates</div>
                  <div class="info-value">${Number(proof.latitude).toFixed(6)}, ${Number(proof.longitude).toFixed(6)}</div>
                </div>
              </div>

              ${videoLinkHtml}
            </div>

            <div class="grid-container">
              ${imagesHtml}
            </div>

            <div class="footer">
              Generated via Moksh CRM • Confidential POP Report • All rights reserved
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const approveProof = async (proofId: string) => {
    setError("");
    setLoadingId(proofId);
    try {
      const res = await fetch(`/api/admin/vendor-proofs/${proofId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyClient: true }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Approve failed");
      const data = await res.json();
      if (data.warning) {
        setError(data.warning);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Approve failed");
    } finally {
      setLoadingId("");
    }
  };

  const rejectProof = async (proofId: string) => {
    const reason = window.prompt("Enter rejection reason for re-upload:");
    if (!reason) return;

    setError("");
    setLoadingId(proofId);
    try {
      const res = await fetch(`/api/admin/vendor-proofs/${proofId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Reject failed");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Reject failed");
    } finally {
      setLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Vendor Proof Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review uploaded site proofs, verify GPS, approve/reject.
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {proofs.map((proof) => {
          const site = proof.inventoryHoarding;
          const location = [
            site.locationName,
            site.city || site.district,
            site.state,
          ]
            .filter(Boolean)
            .join(", ");
          const isPending = proof.status === "SUBMITTED_FOR_APPROVAL";

          return (
            <div
              key={proof.id}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {site.outletName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Site ID: {site.inventoryCode || "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vendor: {proof.vendor.name} ({proof.vendor.email})
                  </p>
                  <p className="text-sm text-gray-600">
                    Campaign/Client:{" "}
                    {proof.assignment.lead?.customerName || "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Location: {location || "-"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      proof.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : proof.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {proof.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-2">
                    Submitted:{" "}
                    {proof.submittedAt
                      ? new Date(proof.submittedAt).toLocaleString("en-IN")
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-700">
                GPS: {Number(proof.latitude).toFixed(6)},{" "}
                {Number(proof.longitude).toFixed(6)}
                {proof.accuracy
                  ? ` (accuracy ${Number(proof.accuracy).toFixed(2)}m)`
                  : ""}{" "}
                <a
                  className="text-blue-600 hover:text-blue-800"
                  href={`https://maps.google.com/?q=${proof.latitude},${proof.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Map
                </a>
              </div>

              {proof.rejectionReason && (
                <div className="mt-2 text-sm text-red-700">
                  Rejection reason: {proof.rejectionReason}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                {proof.media.map((media) => (
                  <div
                    key={media.id}
                    className="border border-gray-200 rounded-md overflow-hidden bg-gray-50"
                  >
                    {media.type === "PHOTO" ? (
                      <img
                        src={media.url}
                        alt={media.fileName}
                        onClick={() => setPreviewMedia({
                          url: media.url,
                          outletName: site.outletName,
                          location: location,
                          latitude: proof.latitude,
                          longitude: proof.longitude,
                          submittedAt: proof.submittedAt
                        })}
                        className="w-full h-28 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <video
                        src={media.url}
                        controls
                        className="w-full h-28 object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentProofForPdf(proof);
                    setSelectedPhotosForPdf([]);
                    setIsPdfSelectorOpen(true);
                  }}
                  className="w-full sm:w-auto bg-[#002147] hover:bg-[#003366] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF Report
                </button>

                {isPending && (
                  <>
                    <button
                      onClick={() => approveProof(proof.id)}
                      disabled={loadingId === proof.id}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {loadingId === proof.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => rejectProof(proof.id)}
                      disabled={loadingId === proof.id}
                      className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      Reject / Re-upload
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {proofs.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
            No proofs found.
          </div>
        )}
      </div>

      {/* Lightbox / Image Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setPreviewMedia(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all focus:outline-none z-50 animate-in fade-in duration-300"
            onClick={() => setPreviewMedia(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-200">
            <div 
              className="relative max-h-[80vh] max-w-full overflow-hidden rounded-lg border border-white/10 shadow-2xl bg-zinc-950 flex flex-col cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewMedia.url}
                alt="Site proof full view"
                className="max-w-full max-h-[80vh] object-contain block"
              />
              
              {/* GPS Info Overlay Box - Floating watermark style overlay directly on the bottom of the image container */}
              <div 
                className="absolute bottom-4 left-4 right-4 flex items-end gap-3 pointer-events-none select-none z-10 animate-in slide-in-from-bottom-6 duration-300"
              >
                {/* Map Square */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg overflow-hidden border border-white/20 flex-shrink-0 shadow-lg bg-zinc-900">
                  <img
                    src="/images/map_placeholder.png"
                    alt="Map"
                    className="w-full h-full object-cover block"
                  />
                </div>
                
                {/* Info Card */}
                <div className="relative flex-1 min-w-[180px] max-w-md bg-black/60 backdrop-blur-md text-white p-3 rounded-lg border border-white/10 flex flex-col justify-between shadow-lg">
                  <div className="space-y-0.5 text-left">
                    <h4 className="font-extrabold text-[11px] sm:text-xs md:text-sm text-white flex items-center gap-1">
                      <span>{previewMedia.outletName || "Outlet Location"}</span>
                    </h4>
                    <p className="text-[9px] sm:text-[10px] md:text-[11px] text-zinc-200 leading-tight">
                      {previewMedia.location || "Address not available"}
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-[11px] text-zinc-300 font-mono">
                      Lat {Number(previewMedia.latitude).toFixed(6)}° Long {Number(previewMedia.longitude).toFixed(6)}°
                    </p>
                    <p className="text-[9px] sm:text-[10px] md:text-[11px] text-zinc-300 font-semibold flex items-center gap-1">
                      <span>{previewMedia.submittedAt ? (() => {
                        try {
                          const date = new Date(previewMedia.submittedAt);
                          const formattedHi = date.toLocaleString("hi-IN", {
                            weekday: 'long',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                          return `${formattedHi} GMT +05:30`;
                        } catch (e) {
                          return new Date(previewMedia.submittedAt).toLocaleString("en-IN") + " GMT +05:30";
                        }
                      })() : "-"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Selection Modal */}
      {isPdfSelectorOpen && currentProofForPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Proof Photos for PDF</h3>
                <p className="text-xs text-gray-500 mt-0.5">Please select exactly 4 photos to arrange in a square grid.</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-all"
                onClick={() => {
                  setIsPdfSelectorOpen(false);
                  setCurrentProofForPdf(null);
                  setSelectedPhotosForPdf([]);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] p-1">
              {currentProofForPdf.media
                .filter((m) => m.type === "PHOTO")
                .map((media) => {
                  const index = selectedPhotosForPdf.indexOf(media.url);
                  const isSelected = index !== -1;
                  return (
                    <div
                      key={media.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPhotosForPdf((prev) => prev.filter((url) => url !== media.url));
                        } else {
                          if (selectedPhotosForPdf.length < 4) {
                            setSelectedPhotosForPdf((prev) => [...prev, media.url]);
                          }
                        }
                      }}
                      className={`relative border-2 rounded-xl overflow-hidden aspect-video bg-gray-100 cursor-pointer transition-all select-none group ${
                        isSelected
                          ? "border-blue-600 scale-[1.02] shadow-md"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={media.url}
                        alt="Proof thumbnail"
                        className="w-full h-full object-cover"
                      />
                      {isSelected ? (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
                          {index + 1}
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full border border-white/50 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  );
                })}
              {currentProofForPdf.media.filter((m) => m.type === "PHOTO").length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-gray-500 font-medium">
                  No photos uploaded for this proof.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs font-bold text-[#002147]">
                Selected: {selectedPhotosForPdf.length}/4
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setIsPdfSelectorOpen(false);
                    setCurrentProofForPdf(null);
                    setSelectedPhotosForPdf([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedPhotosForPdf.length !== 4}
                  className="bg-[#002147] hover:bg-[#003366] text-white font-bold px-5 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  onClick={() => {
                    generatePdf(currentProofForPdf, selectedPhotosForPdf);
                    setIsPdfSelectorOpen(false);
                    setCurrentProofForPdf(null);
                    setSelectedPhotosForPdf([]);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
