import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import type { RailsMentoringRequestResponse } from "@/types/api";

/**
 * Mentoring requests API route matching Rails mentoring/requests controller
 * GET /api/mentoring/requests - List mentor requests (queue)
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    // Mentoring requires authentication and mentor status
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!session.user.isMentor) {
      return NextResponse.json(
        { error: "Mentor access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackSlug = searchParams.get("track_slug") || "";
    const exerciseSlug = searchParams.get("exercise_slug") || "";
    const order = searchParams.get("order") || "";
    const criteria = searchParams.get("criteria") || "";
    const page = searchParams.get("page") || "1";

    // Connect to Rails API to fetch mentor requests
    const railsApiUrl = process.env.RAILS_API_URL || "http://localhost:3000";

    try {
      const queryParams = new URLSearchParams();
      if (trackSlug) queryParams.append("track_slug", trackSlug);
      if (exerciseSlug) queryParams.append("exercise_slug", exerciseSlug);
      if (order) queryParams.append("order", order);
      if (criteria) queryParams.append("criteria", criteria);
      queryParams.append("page", page);

      const response = await fetch(
        `${railsApiUrl}/api/v1/mentoring/requests?${queryParams}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.id}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch mentor requests" },
          { status: response.status }
        );
      }

      const requestsData = await response.json();

      // Return requests data in Rails-compatible format
      return NextResponse.json({
        requests:
          requestsData.requests?.map(
            (request: RailsMentoringRequestResponse) => ({
              uuid: request.uuid,
              student: {
                handle: request.student?.handle,
                avatarUrl: request.student?.avatar_url,
                flair: request.student?.flair,
                reputation: request.student?.reputation,
              },
              exercise: {
                title: request.exercise?.title,
                iconUrl: request.exercise?.icon_url,
                slug: request.exercise?.slug,
              },
              track: {
                title: request.track?.title,
                iconUrl: request.track?.icon_url,
                slug: request.track?.slug,
              },
              status: request.status,
              updatedAt: request.updated_at,
              createdAt: request.created_at,
              isLocked: request.is_locked,
              haveMentoredPreviously: request.have_mentored_previously,
              links: {
                self: `/mentoring/requests/${request.uuid}`,
                discussion: request.discussion_uuid
                  ? `/mentoring/discussions/${request.discussion_uuid}`
                  : null,
              },
            })
          ) || [],
        meta: {
          currentPage: requestsData.meta?.current_page || 1,
          totalPages: requestsData.meta?.total_pages || 1,
          totalCount: requestsData.meta?.total_count || 0,
        },
      });
    } catch (fetchError) {
      console.error("Rails API connection error:", fetchError);

      // Fallback mock data for development
      return NextResponse.json({
        requests: [],
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
        },
      });
    }
  } catch (error) {
    console.error("Mentor requests fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
