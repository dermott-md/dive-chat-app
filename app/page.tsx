"use client";

import { DiveFrame } from "./components/DiveFrame";
import { ChatBubble } from "./components/ChatBubble";
import { SetupCard } from "./components/SetupCard";

const DIVE_ID = process.env.NEXT_PUBLIC_EXPLORE_DIVE_ID;

export default function ExplorePage() {
  if (!DIVE_ID) return <SetupCard />;

  return (
    <>
      <DiveFrame diveId={DIVE_ID} />
      <ChatBubble
        suggestions={[
          "What are the biggest trends in this data?",
          "Summarize the key numbers for me.",
          "What stands out or looks unusual?",
        ]}
      />
    </>
  );
}
