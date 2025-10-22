import React from "react";
import {
  MentorDiscussion,
  Iteration,
  MentoringSessionDonation,
} from "../../types";

interface Mentor {
  id: number;
  avatarUrl: string;
  name: string;
  bio: string;
  handle: string;
  reputation: number;
  numDiscussions: number;
  pronouns?: string[];
}

interface DiscussionInfoProps {
  discussion: MentorDiscussion;
  mentor: Mentor;
  userHandle: string;
  iterations: Iteration[];
  onIterationScroll: (idx: number) => void;
  links: {
    exercise: string;
    exerciseMentorDiscussionUrl: string;
    learnMoreAboutPrivateMentoring: string;
    privateMentoring: string;
    mentoringGuide: string;
    createMentorRequest: string;
    donationsSettings: string;
    donate: string;
  };
  status: string;
  donation: MentoringSessionDonation;
}

export function DiscussionInfo({
  discussion,
  mentor,
  userHandle,
  iterations,
  onIterationScroll,
  status,
}: DiscussionInfoProps): React.ReactElement {
  return (
    <div className="discussion-info">
      <div className="status">Status: {status}</div>
      <div className="participants">
        <span>Student: {userHandle}</span>
        <span>
          Mentor: {mentor.name} (@{mentor.handle})
        </span>
      </div>
      <div className="mentor-info">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mentor.avatarUrl} alt={mentor.name} className="avatar" />
        <div className="details">
          <h4>{mentor.name}</h4>
          <p>{mentor.bio}</p>
          <div className="stats">
            <span>Reputation: {mentor.reputation}</span>
            <span>Discussions: {mentor.numDiscussions}</span>
          </div>
        </div>
      </div>
      <div className="iterations-nav">
        <h5>Iterations ({iterations.length})</h5>
        {iterations.map((iteration, idx) => (
          <button
            key={iteration.idx}
            onClick={() => onIterationScroll(idx)}
            className="iteration-nav-btn"
          >
            Iteration {iteration.idx}
          </button>
        ))}
      </div>
      <div className="timestamps">
        <span>
          Created: {new Date(discussion.createdAt).toLocaleDateString()}
        </span>
        <span>
          Updated: {new Date(discussion.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default DiscussionInfo;
