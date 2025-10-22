import React from "react";
import { PullRequestWidget } from "./PullRequestWidget";
import { ExerciseWidget } from "../ExerciseWidget";
import { ConceptWidget } from "../ConceptWidget";
import { HandleWithFlair } from "../HandleWithFlair";
import type {
  SiteUpdate as SiteUpdateProps,
  SiteUpdateExpandedInfo,
} from "@/types";

interface ExpandedInfoProps {
  icon: SiteUpdateProps["icon"];
  track: SiteUpdateProps["track"];
  expanded: SiteUpdateExpandedInfo;
  pullRequest?: SiteUpdateProps["pullRequest"];
  conceptWidget?: SiteUpdateProps["conceptWidget"];
  exerciseWidget?: SiteUpdateProps["exerciseWidget"];
}

export function ExpandedInfo({
  expanded,
  pullRequest,
  conceptWidget,
  exerciseWidget,
}: ExpandedInfoProps): React.JSX.Element {
  return (
    <div className="expanded">
      <div className="header">
        <div className="info">
          <div className="title">{expanded.title}</div>
          <div className="byline">
            <div className="by flex">
              by&nbsp;
              <strong>
                <HandleWithFlair
                  handle={expanded.author.handle}
                  flair={expanded.author.flair as any}
                />
              </strong>
            </div>
          </div>
        </div>
      </div>
      {expanded.descriptionHtml && (
        <div
          className="description c-highlight-links"
          dangerouslySetInnerHTML={{ __html: expanded.descriptionHtml }}
        />
      )}
      {pullRequest ? <PullRequestWidget {...pullRequest} /> : null}
      {conceptWidget ? (
        <ConceptWidget
          concept={
            conceptWidget as {
              slug: string;
              name: string;
              blurb: string;
              links: { self: string };
            }
          }
        />
      ) : null}
      {exerciseWidget ? (
        <ExerciseWidget exercise={exerciseWidget as any} renderBlurb={false} />
      ) : null}
    </div>
  );
}
