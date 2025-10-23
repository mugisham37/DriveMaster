import React from "react";
import {
  LearningSection,
  Props as LearningSectionProps,
} from "./overview/LearningSection";
import {
  MentoringSection,
  Props as MentoringSectionProps,
} from "./overview/MentoringSection";
import {
  ContributingSection,
  Props as ContributingSectionProps,
} from "./overview/ContributingSection";
import {
  BadgesSection,
  Props as BadgesSectionProps,
} from "./overview/BadgesSection";
import { usePaginatedRequestQuery, Request } from "../../hooks/request-query";
import { ResultsZone } from "../common/ResultsZone";
import { FetchingBoundary } from "../common/FetchingBoundary";
import {
  MentoringTotals,
  MentoringRanks,
  MentoredTrackProgressList,
  MentoredTrackProgress,
  TrackProgress,
  TrackProgressList,
} from "./types";
import { TrackContribution, Badge } from "../../types";

type JourneyOverview = {
  learning: { tracks: readonly TrackProgress[] } & Omit<
    LearningSectionProps,
    "tracks"
  >;
  mentoring: {
    tracks: readonly MentoredTrackProgress[];
    totals: MentoringTotals;
    ranks: MentoringRanks;
  } & Omit<MentoringSectionProps, "tracks">;
  contributing: { tracks: readonly TrackContribution[] } & Omit<
    ContributingSectionProps,
    "tracks"
  >;
  badges: { badges: readonly Badge[] } & Omit<BadgesSectionProps, "badges">;
};

const DEFAULT_ERROR = new Error("Unable to load journey overview");

const formatData = ({ overview }: { overview: JourneyOverview }) => {
  return {
    overview: {
      learning: {
        ...overview.learning,
        tracks: new TrackProgressList({ items: overview.learning.tracks }),
      },
      mentoring: {
        ...overview.mentoring,
        tracks: new MentoredTrackProgressList({
          items: overview.mentoring.tracks,
          totals: overview.mentoring.totals,
          ranks: overview.mentoring.ranks,
        }),
      },
      contributing: {
        ...overview.contributing,
        tracks: overview.contributing.tracks,
      },
      badges: {
        ...overview.badges,
        badges: overview.badges.badges,
      },
    },
  };
};

export const Overview = ({
  request,
  isEnabled,
}: {
  request: Request;
  isEnabled: boolean;
}): React.ReactElement => {
  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery<{
    overview: JourneyOverview;
  }>(["journey-overview"], {
    ...request,
    options: { ...request.options, enabled: isEnabled },
  });
  const formattedData = resolvedData ? formatData(resolvedData) : null;

  return (
    <article className="overview-tab theme-dark">
      <ResultsZone isFetching={isFetching}>
        <FetchingBoundary
          status={status === "pending" ? "loading" : status}
          error={error}
          defaultError={DEFAULT_ERROR}
        >
          {formattedData ? (
            <React.Fragment>
              <div className="md-container">
                <LearningSection {...formattedData.overview.learning} />
                <MentoringSection {...formattedData.overview.mentoring} />
              </div>
              <div className="lg-container">
                <ContributingSection
                  tracks={[...formattedData.overview.contributing.tracks]}
                  links={formattedData.overview.contributing.links}
                />
              </div>
              <div className="md-container">
                <BadgesSection
                  badges={
                    {
                      items: [...formattedData.overview.badges.badges],
                      length: formattedData.overview.badges.badges.length,
                      sort: function () {
                        return {
                          items: [...formattedData.overview.badges.badges],
                          length: formattedData.overview.badges.badges.length,
                          sort: function () {
                            return this;
                          },
                          filter: function () {
                            return this;
                          },
                        };
                      },
                      filter: function () {
                        return {
                          items: [...formattedData.overview.badges.badges],
                          length: formattedData.overview.badges.badges.length,
                          sort: function () {
                            return this;
                          },
                          filter: function () {
                            return this;
                          },
                        };
                      },
                    } as any
                  }
                  links={formattedData.overview.badges.links}
                />
              </div>
            </React.Fragment>
          ) : null}
        </FetchingBoundary>
      </ResultsZone>
    </article>
  );
};
