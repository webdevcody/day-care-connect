import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  reviews,
  reviewResponses,
  facilities,
  enrollments,
  children,
  users,
  eq,
  and,
  sql,
  desc,
  asc,
} from "@daycare-hub/db";
import {
  createReviewSchema,
  updateReviewSchema,
  createReviewResponseSchema,
  updateReviewResponseSchema,
  getReviewsSchema,
} from "@daycare-hub/shared";
import { assertFacilityManager } from "../facility-auth";
import { sendNotification } from "./notification-service";

async function recalculateFacilityRating(facilityId: string) {
  const [result] = await db
    .select({
      avg: sql<string | null>`AVG(${reviews.overallRating})::numeric(2,1)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.facilityId, facilityId));

  await db
    .update(facilities)
    .set({
      ratingAverage: result.avg,
      reviewCount: result.count,
      updatedAt: new Date(),
    })
    .where(eq(facilities.id, facilityId));
}

export const checkReviewEligibility = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) return { eligible: false, existingReview: null };

    // Check if parent has an eligible enrollment at this facility
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(children.parentId, session.user.id),
          sql`${enrollments.status} IN ('active', 'approved', 'withdrawn')`
        )
      )
      .limit(1);

    if (!enrollment) return { eligible: false, existingReview: null };

    // Check for existing review
    const [existing] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.facilityId, data.facilityId),
          eq(reviews.parentId, session.user.id)
        )
      )
      .limit(1);

    return { eligible: true, existingReview: existing || null };
  });

export const getReviewSummary = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const [summary] = await db
      .select({
        avgRating: sql<string | null>`AVG(${reviews.overallRating})::numeric(2,1)`,
        totalCount: sql<number>`COUNT(*)::int`,
        avgSafety: sql<string | null>`AVG(${reviews.safetyRating})::numeric(2,1)`,
        avgStaff: sql<string | null>`AVG(${reviews.staffRating})::numeric(2,1)`,
        avgActivities: sql<string | null>`AVG(${reviews.activitiesRating})::numeric(2,1)`,
        avgValue: sql<string | null>`AVG(${reviews.valueRating})::numeric(2,1)`,
        categoryCount: sql<number>`COUNT(${reviews.safetyRating})::int`,
        recommendCount: sql<number>`COUNT(CASE WHEN ${reviews.wouldRecommend} = true THEN 1 END)::int`,
        recommendTotal: sql<number>`COUNT(${reviews.wouldRecommend})::int`,
        stars5: sql<number>`COUNT(CASE WHEN ${reviews.overallRating} = 5 THEN 1 END)::int`,
        stars4: sql<number>`COUNT(CASE WHEN ${reviews.overallRating} = 4 THEN 1 END)::int`,
        stars3: sql<number>`COUNT(CASE WHEN ${reviews.overallRating} = 3 THEN 1 END)::int`,
        stars2: sql<number>`COUNT(CASE WHEN ${reviews.overallRating} = 2 THEN 1 END)::int`,
        stars1: sql<number>`COUNT(CASE WHEN ${reviews.overallRating} = 1 THEN 1 END)::int`,
      })
      .from(reviews)
      .where(eq(reviews.facilityId, data.facilityId));

    return {
      avgRating: summary.avgRating ? parseFloat(summary.avgRating) : null,
      totalCount: summary.totalCount,
      distribution: {
        5: summary.stars5,
        4: summary.stars4,
        3: summary.stars3,
        2: summary.stars2,
        1: summary.stars1,
      },
      categoryAverages:
        summary.categoryCount >= 5
          ? {
              safety: summary.avgSafety ? parseFloat(summary.avgSafety) : null,
              staff: summary.avgStaff ? parseFloat(summary.avgStaff) : null,
              activities: summary.avgActivities ? parseFloat(summary.avgActivities) : null,
              value: summary.avgValue ? parseFloat(summary.avgValue) : null,
            }
          : null,
      recommendPercentage:
        summary.recommendTotal > 0
          ? Math.round((summary.recommendCount / summary.recommendTotal) * 100)
          : null,
    };
  });

export const getReviews = createServerFn({ method: "GET" })
  .inputValidator((data: Record<string, unknown>) => getReviewsSchema.parse(data))
  .handler(async ({ data }) => {
    const { facilityId, sort, rating, page, limit } = data;
    const offset = (page - 1) * limit;

    const conditions = [eq(reviews.facilityId, facilityId)];
    if (rating) {
      conditions.push(eq(reviews.overallRating, rating));
    }

    let orderBy;
    switch (sort) {
      case "highest":
        orderBy = desc(reviews.overallRating);
        break;
      case "lowest":
        orderBy = asc(reviews.overallRating);
        break;
      default:
        orderBy = desc(reviews.createdAt);
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(reviews)
      .where(whereClause);

    const reviewRows = await db
      .select({
        id: reviews.id,
        facilityId: reviews.facilityId,
        parentId: reviews.parentId,
        overallRating: reviews.overallRating,
        safetyRating: reviews.safetyRating,
        staffRating: reviews.staffRating,
        activitiesRating: reviews.activitiesRating,
        valueRating: reviews.valueRating,
        title: reviews.title,
        body: reviews.body,
        wouldRecommend: reviews.wouldRecommend,
        isReported: reviews.isReported,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        parentName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.parentId, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Batch-load responses
    const responsesMap: Record<
      string,
      { id: string; body: string; responderName: string; createdAt: Date }
    > = {};
    if (reviewRows.length > 0) {
      const reviewIds = reviewRows.map((r) => r.id);
      const responses = await db
        .select({
          id: reviewResponses.id,
          reviewId: reviewResponses.reviewId,
          body: reviewResponses.body,
          responderName: users.name,
          createdAt: reviewResponses.createdAt,
        })
        .from(reviewResponses)
        .innerJoin(users, eq(reviewResponses.responderId, users.id))
        .where(sql`${reviewResponses.reviewId} IN ${reviewIds}`);

      for (const resp of responses) {
        responsesMap[resp.reviewId] = {
          id: resp.id,
          body: resp.body,
          responderName: resp.responderName,
          createdAt: resp.createdAt,
        };
      }
    }

    const reviewsWithResponses = reviewRows.map((r) => ({
      ...r,
      response: responsesMap[r.id] || null,
    }));

    return {
      reviews: reviewsWithResponses,
      totalCount: total,
      hasMore: offset + limit < total,
    };
  });

export const createReview = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) => createReviewSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    // Check eligibility
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .innerJoin(children, eq(enrollments.childId, children.id))
      .where(
        and(
          eq(enrollments.facilityId, data.facilityId),
          eq(children.parentId, session.user.id),
          sql`${enrollments.status} IN ('active', 'approved', 'withdrawn')`
        )
      )
      .limit(1);

    if (!enrollment) throw new Error("Not eligible to review this facility");

    // Check for existing review
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.facilityId, data.facilityId),
          eq(reviews.parentId, session.user.id)
        )
      )
      .limit(1);

    if (existing) throw new Error("You have already reviewed this facility");

    const [review] = await db
      .insert(reviews)
      .values({
        facilityId: data.facilityId,
        parentId: session.user.id,
        overallRating: data.overallRating,
        safetyRating: data.safetyRating,
        staffRating: data.staffRating,
        activitiesRating: data.activitiesRating,
        valueRating: data.valueRating,
        title: data.title,
        body: data.body,
        wouldRecommend: data.wouldRecommend,
      })
      .returning();

    await recalculateFacilityRating(data.facilityId);

    // Notify facility owner
    const [facility] = await db
      .select({ ownerId: facilities.ownerId, name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, data.facilityId))
      .limit(1);

    if (facility) {
      await sendNotification({
        type: "review_posted",
        recipientId: facility.ownerId,
        data: {
          parentName: session.user.name,
          rating: data.overallRating,
          facilityName: facility.name,
        },
        actionUrl: `/facility/${data.facilityId}/reviews`,
      });
    }

    return review;
  });

export const updateReview = createServerFn({ method: "POST" })
  .inputValidator((data: { reviewId: string } & Record<string, unknown>) => ({
    reviewId: data.reviewId,
    ...updateReviewSchema.parse(data),
  }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const { reviewId, ...updateData } = data;

    const [review] = await db
      .select({ parentId: reviews.parentId, facilityId: reviews.facilityId })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review) throw new Error("Review not found");
    if (review.parentId !== session.user.id) throw new Error("Not authorized");

    const [updated] = await db
      .update(reviews)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();

    await recalculateFacilityRating(review.facilityId);

    return updated;
  });

export const deleteReview = createServerFn({ method: "POST" })
  .inputValidator((data: { reviewId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [review] = await db
      .select({ parentId: reviews.parentId, facilityId: reviews.facilityId })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) throw new Error("Review not found");
    if (review.parentId !== session.user.id) throw new Error("Not authorized");

    await db.delete(reviews).where(eq(reviews.id, data.reviewId));
    await recalculateFacilityRating(review.facilityId);

    return { success: true };
  });

export const reportReview = createServerFn({ method: "POST" })
  .inputValidator((data: { reviewId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await db
      .update(reviews)
      .set({ isReported: true })
      .where(eq(reviews.id, data.reviewId));

    return { success: true };
  });

export const createReviewResponse = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { reviewId: string } & Record<string, unknown>) => ({
      reviewId: data.reviewId,
      ...createReviewResponseSchema.parse(data),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [review] = await db
      .select({ facilityId: reviews.facilityId, parentId: reviews.parentId })
      .from(reviews)
      .where(eq(reviews.id, data.reviewId))
      .limit(1);

    if (!review) throw new Error("Review not found");

    await assertFacilityManager(review.facilityId, session.user.id);

    const [response] = await db
      .insert(reviewResponses)
      .values({
        reviewId: data.reviewId,
        responderId: session.user.id,
        body: data.body,
      })
      .returning();

    // Notify the review author
    const [facility] = await db
      .select({ name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, review.facilityId))
      .limit(1);

    await sendNotification({
      type: "review_response",
      recipientId: review.parentId,
      data: { facilityName: facility?.name },
      actionUrl: `/facilities/${review.facilityId}`,
    });

    return response;
  });

export const updateReviewResponse = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { responseId: string } & Record<string, unknown>) => ({
      responseId: data.responseId,
      ...updateReviewResponseSchema.parse(data),
    })
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const [response] = await db
      .select({
        reviewId: reviewResponses.reviewId,
      })
      .from(reviewResponses)
      .where(eq(reviewResponses.id, data.responseId))
      .limit(1);

    if (!response) throw new Error("Response not found");

    // Get the review to check facility access
    const [review] = await db
      .select({ facilityId: reviews.facilityId })
      .from(reviews)
      .where(eq(reviews.id, response.reviewId))
      .limit(1);

    if (!review) throw new Error("Review not found");

    await assertFacilityManager(review.facilityId, session.user.id);

    const [updated] = await db
      .update(reviewResponses)
      .set({ body: data.body, updatedAt: new Date() })
      .where(eq(reviewResponses.id, data.responseId))
      .returning();

    return updated;
  });

export const getMyReviews = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    const reviewRows = await db
      .select({
        id: reviews.id,
        facilityId: reviews.facilityId,
        overallRating: reviews.overallRating,
        safetyRating: reviews.safetyRating,
        staffRating: reviews.staffRating,
        activitiesRating: reviews.activitiesRating,
        valueRating: reviews.valueRating,
        title: reviews.title,
        body: reviews.body,
        wouldRecommend: reviews.wouldRecommend,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        facilityName: facilities.name,
      })
      .from(reviews)
      .innerJoin(facilities, eq(reviews.facilityId, facilities.id))
      .where(eq(reviews.parentId, session.user.id))
      .orderBy(desc(reviews.createdAt));

    // Batch-load responses
    if (reviewRows.length === 0) return reviewRows.map((r) => ({ ...r, response: null }));

    const reviewIds = reviewRows.map((r) => r.id);
    const responses = await db
      .select({
        id: reviewResponses.id,
        reviewId: reviewResponses.reviewId,
        body: reviewResponses.body,
        responderName: users.name,
        createdAt: reviewResponses.createdAt,
      })
      .from(reviewResponses)
      .innerJoin(users, eq(reviewResponses.responderId, users.id))
      .where(sql`${reviewResponses.reviewId} IN ${reviewIds}`);

    const responsesMap: Record<string, (typeof responses)[number]> = {};
    for (const resp of responses) {
      responsesMap[resp.reviewId] = resp;
    }

    return reviewRows.map((r) => ({
      ...r,
      response: responsesMap[r.id] || null,
    }));
  }
);

export const getAdminFacilityReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { facilityId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Not authenticated");

    await assertFacilityManager(data.facilityId, session.user.id);

    const reviewRows = await db
      .select({
        id: reviews.id,
        facilityId: reviews.facilityId,
        parentId: reviews.parentId,
        overallRating: reviews.overallRating,
        safetyRating: reviews.safetyRating,
        staffRating: reviews.staffRating,
        activitiesRating: reviews.activitiesRating,
        valueRating: reviews.valueRating,
        title: reviews.title,
        body: reviews.body,
        wouldRecommend: reviews.wouldRecommend,
        isReported: reviews.isReported,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        parentName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.parentId, users.id))
      .where(eq(reviews.facilityId, data.facilityId))
      .orderBy(desc(reviews.createdAt));

    if (reviewRows.length === 0) return reviewRows.map((r) => ({ ...r, response: null }));

    const reviewIds = reviewRows.map((r) => r.id);
    const responses = await db
      .select({
        id: reviewResponses.id,
        reviewId: reviewResponses.reviewId,
        body: reviewResponses.body,
        responderId: reviewResponses.responderId,
        responderName: users.name,
        createdAt: reviewResponses.createdAt,
      })
      .from(reviewResponses)
      .innerJoin(users, eq(reviewResponses.responderId, users.id))
      .where(sql`${reviewResponses.reviewId} IN ${reviewIds}`);

    const responsesMap: Record<string, (typeof responses)[number]> = {};
    for (const resp of responses) {
      responsesMap[resp.reviewId] = resp;
    }

    return reviewRows.map((r) => ({
      ...r,
      response: responsesMap[r.id] || null,
    }));
  });
