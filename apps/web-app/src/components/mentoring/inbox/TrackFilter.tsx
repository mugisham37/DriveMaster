import React from "react";
import type {
  MentorRequest,
  DiscussionStatus,
  MentoredTrack,
} from "@/components/types";
import { Select } from "../../common/Select";
import { useMentorTracks } from "@/hooks/use-mentor-tracks";

interface Props {
  request: MentorRequest<{ status: DiscussionStatus }>;
  value: string | null;
  setTrack: (trackSlug: string | null) => void;
}

export function TrackFilter({
  request,
  value,
  setTrack,
}: Props): React.JSX.Element {
  const { data: tracks } = useMentorTracks(request);

  const options = React.useMemo(() => {
    const trackOptions =
      (tracks as MentoredTrack[])?.map((track: MentoredTrack) => ({
        value: track.slug,
        label: track.title,
      })) || [];

    return [{ value: "", label: "All Tracks" }, ...trackOptions];
  }, [tracks]);

  return (
    <div className="track-filter">
      <Select
        value={value || ""}
        onChange={(selectedValue: string) => setTrack(selectedValue || null)}
        options={options}
        placeholder="Select Track"
      />
    </div>
  );
}
