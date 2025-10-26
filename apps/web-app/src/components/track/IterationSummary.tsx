'use client'

import React, { useEffect, useState, useRef, useContext } from "react";
import { shortFromNow, fromNow } from "@/utils/time";
import { SubmissionMethodIcon } from "./iteration-summary/SubmissionMethodIcon";
import { AnalysisStatusSummary } from "./iteration-summary/AnalysisStatusSummary";
import { ProcessingStatusButton } from "./iteration-summary/ProcessingStatusButton";
import { ProcessingStatusSummary } from "../common";
// import { IterationChannel } from '../../channels/iterationChannel'
import {
  Iteration,
  IterationStatus,
  SubmissionMethod,
} from "@/components/types";

// Mock IterationChannel for now - replace with actual implementation
class IterationChannel {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _uuid: string, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback: (iteration: Iteration) => void
  ) {
    // Mock implementation - in real implementation these would be used to establish WebSocket connection
  }
  
  disconnect() {}
}
import { OutOfDateNotice } from "./iteration-summary/OutOfDateNotice";
// import { ScreenSizeContext } from '../mentoring/session/ScreenSizeContext'

// Mock ScreenSizeContext for now - replace with actual implementation
const ScreenSizeContext = React.createContext<{ isBelowLgWidth?: boolean }>({});
import { useAppTranslation } from "@/i18n/useAppTranslation";

// const SUBMISSION_METHOD_LABELS = {
//   cli: 'CLI',
//   api: 'Editor',
// }

type IterationSummaryProps = {
  iteration: Iteration;
  className?: string;
  showSubmissionMethod: boolean;
  showTimeStamp?: boolean;
  showTestsStatusAsButton: boolean;
  showFeedbackIndicator: boolean;
  OutOfDateNotice?: React.ReactNode;
};

export default function IterationSummaryWithWebsockets({
  iteration: initialIteration,
  ...props
}: IterationSummaryProps): React.JSX.Element {
  const [iteration, setIteration] = useState(initialIteration);
  const channel = useRef<IterationChannel | undefined>(undefined);

  useEffect(() => {
    const iterationChannel = new IterationChannel(
      iteration.uuid,
      (iteration: Iteration) => {
        setIteration(iteration);
      }
    );

    channel.current = iterationChannel;

    return () => {
      iterationChannel.disconnect();
    };
  }, [channel, iteration, setIteration]);

  useEffect(() => {
    setIteration(initialIteration);
  }, [initialIteration]);

  return <IterationSummary iteration={iteration} {...props} />;
}

export function IterationSummary({
  iteration,
  className,
  showSubmissionMethod,
  showTestsStatusAsButton,
  showFeedbackIndicator,
  OutOfDateNotice,
  showTimeStamp = true,
}: IterationSummaryProps): React.JSX.Element {
  const { t } = useAppTranslation("components/track/IterationSummary.tsx");
  const { isBelowLgWidth = false } = useContext(ScreenSizeContext) || {};
  return (
    <div className={`c-iteration-summary ${className ?? ""}`}>
      {showSubmissionMethod ? (
        <SubmissionMethodIcon
          submissionMethod={iteration.submissionMethod || SubmissionMethod.API}
        />
      ) : null}
      <div className="--info">
        <div className="--idx">
          <h3>{t("iterationSummary.iteration", { idx: iteration.idx })}</h3>
          {iteration.isLatest ? (
            <div className="--latest" aria-label="Latest iteration">
              {t("iterationSummary.latest")}
            </div>
          ) : null}

          {iteration.isPublished ? (
            <div
              className="--published"
              aria-label="This iteration is published"
            >
              {t("iterationSummary.published")}
            </div>
          ) : null}
        </div>
        <div className="--details" data-testid="details">
          {!isBelowLgWidth && t("iterationSummary.submitted")}
          {showSubmissionMethod
            ? `${t(
                (iteration.submissionMethod || SubmissionMethod.API) ===
                  SubmissionMethod.CLI
                  ? "iterationSummary.viaCli"
                  : "iterationSummary.viaEditor"
              )}${showTimeStamp ? "," : ""} `
            : null}
          {showTimeStamp && (
            <time
              dateTime={iteration.createdAt.toString()}
              title={iteration.createdAt.toString()}
            >
              {fromNow(iteration.createdAt)}
            </time>
          )}
        </div>
      </div>
      {OutOfDateNotice}

      {showTestsStatusAsButton ? (
        <ProcessingStatusButton iteration={iteration} />
      ) : (
        <ProcessingStatusSummary
          iterationStatus={iteration.status || IterationStatus.PROCESSING}
        />
      )}

      {showFeedbackIndicator ? (
        <AnalysisStatusSummary
          numEssentialAutomatedComments={
            iteration.numEssentialAutomatedComments || 0
          }
          numActionableAutomatedComments={
            iteration.numActionableAutomatedComments || 0
          }
          numNonActionableAutomatedComments={
            iteration.numNonActionableAutomatedComments || 0
          }
        />
      ) : null}
      <time
        dateTime={iteration.createdAt.toString()}
        title={iteration.createdAt.toString()}
        className="--time"
      >
        {shortFromNow(iteration.createdAt)}
      </time>
    </div>
  );
}

IterationSummary.OutOfDateNotice = OutOfDateNotice;
