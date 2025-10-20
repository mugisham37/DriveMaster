import React from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { TrackIcon } from './TrackIcon';
import { ExerciseIcon } from './ExerciseIcon';
import { HandleWithFlair } from './HandleWithFlair';
import { fromNow } from '@/utils/date';

interface BaseActivity {
  id: string;
  type: string;
  occurredAt: string;
  user: {
    handle: string;
    avatarUrl: string;
    flair?: string;
  };
}

interface ExerciseActivity extends BaseActivity {
  type: 'exercise_completed' | 'exercise_started';
  exercise: {
    title: string;
    slug: string;
    iconUrl: string;
  };
  track: {
    title: string;
    slug: string;
    iconUrl: string;
  };
}

interface SolutionActivity extends BaseActivity {
  type: 'solution_published';
  solution: {
    uuid: string;
  };
  exercise: {
    title: string;
    slug: string;
    iconUrl: string;
  };
  track: {
    title: string;
    slug: string;
    iconUrl: string;
  };
}

interface BadgeActivity extends BaseActivity {
  type: 'badge_acquired';
  badge: {
    name: string;
    iconUrl: string;
  };
}

interface MentoringActivity extends BaseActivity {
  type: 'mentoring_started' | 'mentoring_completed';
  discussion: {
    uuid: string;
  };
  exercise: {
    title: string;
    slug: string;
    iconUrl: string;
  };
  track: {
    title: string;
    slug: string;
    iconUrl: string;
  };
  student?: {
    handle: string;
    avatarUrl: string;
    flair?: string;
  };
}

type Activity = ExerciseActivity | SolutionActivity | BadgeActivity | MentoringActivity;

interface UserActivityProps {
  activity: Activity;
}

export function UserActivity({ activity }: UserActivityProps) {
  const renderActivityContent = () => {
    switch (activity.type) {
      case 'exercise_completed':
        return (
          <ExerciseCompletedActivity activity={activity as ExerciseActivity} />
        );
      case 'exercise_started':
        return (
          <ExerciseStartedActivity activity={activity as ExerciseActivity} />
        );
      case 'solution_published':
        return (
          <SolutionPublishedActivity activity={activity as SolutionActivity} />
        );
      case 'badge_acquired':
        return (
          <BadgeAcquiredActivity activity={activity as BadgeActivity} />
        );
      case 'mentoring_started':
        return (
          <MentoringStartedActivity activity={activity as MentoringActivity} />
        );
      case 'mentoring_completed':
        return (
          <MentoringCompletedActivity activity={activity as MentoringActivity} />
        );
      default:
        return <DefaultActivity activity={activity} />;
    }
  };

  return (
    <div className="user-activity" data-activity-type={activity.type}>
      {renderActivityContent()}
    </div>
  );
}

function ExerciseCompletedActivity({ activity }: { activity: ExerciseActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> completed </span>
        <Link href={`/tracks/${activity.track.slug}/exercises/${activity.exercise.slug}`}>
          {activity.exercise.title}
        </Link>
        <span> in </span>
        <Link href={`/tracks/${activity.track.slug}`}>
          {activity.track.title}
        </Link>
      </div>
      <div className="activity-icons">
        <ExerciseIcon 
          iconUrl={activity.exercise.iconUrl} 
          title={activity.exercise.title}
        />
        <TrackIcon 
          iconUrl={activity.track.iconUrl} 
          title={activity.track.title}
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function ExerciseStartedActivity({ activity }: { activity: ExerciseActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> started </span>
        <Link href={`/tracks/${activity.track.slug}/exercises/${activity.exercise.slug}`}>
          {activity.exercise.title}
        </Link>
        <span> in </span>
        <Link href={`/tracks/${activity.track.slug}`}>
          {activity.track.title}
        </Link>
      </div>
      <div className="activity-icons">
        <ExerciseIcon 
          iconUrl={activity.exercise.iconUrl} 
          title={activity.exercise.title}
        />
        <TrackIcon 
          iconUrl={activity.track.iconUrl} 
          title={activity.track.title}
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function SolutionPublishedActivity({ activity }: { activity: SolutionActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> published a solution to </span>
        <Link href={`/tracks/${activity.track.slug}/exercises/${activity.exercise.slug}/solutions/${activity.solution.uuid}`}>
          {activity.exercise.title}
        </Link>
        <span> in </span>
        <Link href={`/tracks/${activity.track.slug}`}>
          {activity.track.title}
        </Link>
      </div>
      <div className="activity-icons">
        <ExerciseIcon 
          iconUrl={activity.exercise.iconUrl} 
          title={activity.exercise.title}
        />
        <TrackIcon 
          iconUrl={activity.track.iconUrl} 
          title={activity.track.title}
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function BadgeAcquiredActivity({ activity }: { activity: BadgeActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> acquired the </span>
        <strong>{activity.badge.name}</strong>
        <span> badge</span>
      </div>
      <div className="activity-icons">
        <img 
          src={activity.badge.iconUrl} 
          alt={activity.badge.name}
          className="badge-icon"
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function MentoringStartedActivity({ activity }: { activity: MentoringActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> started mentoring </span>
        {activity.student && (
          <>
            <HandleWithFlair 
              handle={activity.student.handle} 
              flair={activity.student.flair as any}
            />
            <span> on </span>
          </>
        )}
        <Link href={`/tracks/${activity.track.slug}/exercises/${activity.exercise.slug}`}>
          {activity.exercise.title}
        </Link>
        <span> in </span>
        <Link href={`/tracks/${activity.track.slug}`}>
          {activity.track.title}
        </Link>
      </div>
      <div className="activity-icons">
        <ExerciseIcon 
          iconUrl={activity.exercise.iconUrl} 
          title={activity.exercise.title}
        />
        <TrackIcon 
          iconUrl={activity.track.iconUrl} 
          title={activity.track.title}
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function MentoringCompletedActivity({ activity }: { activity: MentoringActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> completed mentoring </span>
        {activity.student && (
          <>
            <HandleWithFlair 
              handle={activity.student.handle} 
              flair={activity.student.flair as any}
            />
            <span> on </span>
          </>
        )}
        <Link href={`/tracks/${activity.track.slug}/exercises/${activity.exercise.slug}`}>
          {activity.exercise.title}
        </Link>
        <span> in </span>
        <Link href={`/tracks/${activity.track.slug}`}>
          {activity.track.title}
        </Link>
      </div>
      <div className="activity-icons">
        <ExerciseIcon 
          iconUrl={activity.exercise.iconUrl} 
          title={activity.exercise.title}
        />
        <TrackIcon 
          iconUrl={activity.track.iconUrl} 
          title={activity.track.title}
        />
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}

function DefaultActivity({ activity }: { activity: BaseActivity }) {
  return (
    <div className="activity-content">
      <Avatar 
        user={activity.user} 
        size="small" 
      />
      <div className="activity-text">
        <HandleWithFlair 
          handle={activity.user.handle} 
          flair={activity.user.flair as any}
        />
        <span> performed an activity</span>
      </div>
      <time className="activity-time">
        {fromNow(activity.occurredAt)}
      </time>
    </div>
  );
}