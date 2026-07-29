import { Settings } from "lucide-react";

/** Shown on the Explore page when NEXT_PUBLIC_EXPLORE_DIVE_ID isn't configured yet. */
export function SetupCard() {
  return (
    <div className="center-wrap">
      <div className="card">
        <div className="badge">
          <Settings size={13} /> One quick step
        </div>
        <h2>Pick the dive to show here</h2>
        <p>
          This page displays one MotherDuck Dive full-screen. Point it at a dive by setting an
          environment variable, then reload.
        </p>
        <ol>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code>.
          </li>
          <li>
            Set <code>NEXT_PUBLIC_EXPLORE_DIVE_ID</code> to your dive&apos;s ID (find it in the
            dive&apos;s URL, or with the MCP <code>list_dives</code> tool).
          </li>
          <li>
            Make sure that dive&apos;s data is <strong>shared with your service account</strong>,
            and that <code>MOTHERDUCK_TOKEN</code> + <code>MD_SERVICE_ACCOUNT_USERNAME</code> are set.
          </li>
          <li>
            Restart <code>npm run dev</code>.
          </li>
        </ol>
      </div>
    </div>
  );
}
