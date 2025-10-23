import React, { useState, useCallback, useEffect } from "react";
import { scrollToTop } from "@/utils/scroll-to-top";
import { ContributionResults } from "./ContributionResults";
import { type Request, usePaginatedRequestQuery } from "@/hooks/request-query";
import { removeEmpty, useHistory } from "@/hooks/use-history";
import { useDeepMemo } from "@/hooks/use-deep-memo";
import { useList } from "@/hooks/use-list";
import { ResultsZone } from "@/components/common/ResultsZone";
import { Pagination } from "@/components/common";
import { FetchingBoundary } from "@/components/common/FetchingBoundary";
import type { Contribution } from "@/types";
import { CategorySelect } from "./contributions-list/CategorySelect";
import { useAppTranslation } from "@/i18n/useAppTranslation";

const DEFAULT_ERROR = new Error("Unable to load contributions list");

export type APIResult = {
  results: Contribution[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    links: {
      markAllAsSeen: string;
    };
    unseenTotal: number;
  };
};

export function ContributionsList({
  request: initialRequest,
  isEnabled,
}: {
  request: Request;
  isEnabled: boolean;
}): React.ReactElement {
  const { t } = useAppTranslation("components/journey");
  const {
    request,
    setPage,
    setCriteria: setRequestCriteria,
    setQuery,
  } = useList(initialRequest);
  const [criteria, setCriteria] = useState<string>(
    (request.query?.criteria as string) || ""
  );
  const cacheKey = [
    "contributions-list",
    request.endpoint,
    JSON.stringify(removeEmpty(request.query || {})),
  ] as const;
  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery<APIResult>([...cacheKey], {
    ...request,
    query: removeEmpty(request.query || {}),
    options: { ...request.options, enabled: isEnabled },
  });

  const requestQuery = useDeepMemo(request.query);
  const setCategory = useCallback(
    (category: string | undefined) => {
      setQuery({ ...requestQuery, category: category, page: undefined });
    },
    [requestQuery, setQuery]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return;
      setRequestCriteria(criteria);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [setRequestCriteria, criteria]);

  useHistory({ pushOn: removeEmpty(request.query || {}) });

  return (
    <article
      data-scroll-top-anchor="contributions-list"
      className="reputation-tab theme-dark"
    >
      <div className="md-container container">
        <div className="c-search-bar">
          <input
            className="--search"
            onChange={(e) => {
              setCriteria(e.target.value);
            }}
            value={criteria || ""}
            placeholder={t("contributionsList.searchByContributionName")}
          />
          <CategorySelect
            value={request.query?.category}
            setValue={setCategory}
          />
        </div>
        <ResultsZone isFetching={isFetching}>
          <FetchingBoundary
            status={status === 'pending' ? 'loading' : status}
            error={error}
            defaultError={DEFAULT_ERROR}
          >
            {resolvedData ? (
              <React.Fragment>
                <ContributionResults data={resolvedData} cacheKey={cacheKey} />
                <Pagination
                  current={(request.query?.page as number) || 1}
                  total={resolvedData.meta.totalPages}
                  setPage={(p) => {
                    setPage(p);
                    scrollToTop("contributions-list");
                  }}
                />
              </React.Fragment>
            ) : null}
          </FetchingBoundary>
        </ResultsZone>
      </div>
    </article>
  );
}
