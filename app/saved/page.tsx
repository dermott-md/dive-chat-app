"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, X, BookMarked, Sparkles } from "lucide-react";
import { DiveFrame } from "../components/DiveFrame";
import { listReports, removeReport, type SavedReport } from "@/lib/store";

export default function SavedPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [viewing, setViewing] = useState<SavedReport | null>(null);

  useEffect(() => {
    setReports(listReports());
  }, []);

  const handleRemove = (e: React.MouseEvent, diveId: string) => {
    e.stopPropagation();
    removeReport(diveId);
    setReports(listReports());
  };

  const handleEdit = (e: React.MouseEvent, r: SavedReport) => {
    e.stopPropagation();
    router.push(`/build?dive=${encodeURIComponent(r.diveId)}&title=${encodeURIComponent(r.title)}`);
  };

  return (
    <div className="saved-wrap">
      <div className="saved-head">
        <div>
          <h1>Saved reports</h1>
          <p>Reports you&apos;ve built and saved. Click one to open it full-screen.</p>
        </div>
        <Link href="/build" className="btn btn-primary">
          <Sparkles size={16} /> Build a new report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <BookMarked size={30} style={{ opacity: 0.4 }} />
          <h3>No saved reports yet</h3>
          <p>Head to “Build a report”, describe what you want in plain English, then hit Save. Your reports will show up here.</p>
          <Link href="/build" className="btn btn-primary">
            <Sparkles size={16} /> Build your first report
          </Link>
        </div>
      ) : (
        <div className="saved-grid">
          {reports.map((r) => (
            <div key={r.diveId} className="report-card" onClick={() => setViewing(r)}>
              <h3>{r.title}</h3>
              {r.description && <div className="desc">{r.description}</div>}
              <div className="meta">
                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                <div className="card-actions">
                  <button className="icon-btn" onClick={(e) => handleEdit(e, r)} title="Edit in builder">
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn danger" onClick={(e) => handleRemove(e, r.diveId)} title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div className="overlay" onClick={() => setViewing(null)}>
          <div className="overlay-bar" onClick={(e) => e.stopPropagation()}>
            <h3>{viewing.title}</h3>
            <button className="btn" onClick={() => setViewing(null)}>
              <X size={16} /> Close
            </button>
          </div>
          <div className="overlay-frame" onClick={(e) => e.stopPropagation()}>
            <DiveFrame diveId={viewing.diveId} />
          </div>
        </div>
      )}
    </div>
  );
}
