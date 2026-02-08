import { Hono } from "hono";
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
import { assertFacilityPermission } from "../lib/facility-auth";
import { sendNotification } from "../lib/notification-service";

const app = new Hono();

async function recalculateFacilityRating(facilityId: string) {
  const [stats] = await db
    .select({
      avg: sql<string>`COALESCE(avg(${reviews.overallRating})::numeric(2,1), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.facilityId, facilityId));

  await db
    .update(facilities)
    .set({
      ratingAverage: stats.avg,
      reviewCount: stats.count,
      updatedAt: new Date(),
    })
    .where(eq(facilities.id, facilityId));
}

app.get("/eligibility", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.query("facilityId");

  if (!facilityId) {
    return c.json({ error: "facilityId is required" }, 400);
  }

  // Check if user has eligible enrollment
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(children.parentId, userId),
        eq(enrollments.facilityId, facilityId),
        sql`${enrollments.status} IN ('active', 'approved', 'withdrawn')`
      )
    )
    .limit(1);

  // Check for existing review
  const [existingReview] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.facilityId, facilityId), eq(reviews.parentId, userId)))
    .limit(1);

  return c.json({
    eligible: !!enrollment,
    existingReview: existingReview || null,
  });
});

app.get("/summary", async (c) => {
  const facilityId = c.req.query("facilityId");

  if (!facilityId) {
    return c.json({ error: "facilityId is required" }, 400);
  }

  const [stats] = await db
    .select({
      avgRating: sql<string>`COALESCE(avg(${reviews.overallRating})::numeric(2,1), 0)`,
      totalCount: sql<number>`count(*)::int`,
      avgSafety: sql<string>`COALESCE(avg(${reviews.safetyRating})::numeric(2,1), 0)`,
      avgStaff: sql<string>`COALESCE(avg(${reviews.staffRating})::numeric(2,1), 0)`,
      avgActivities: sql<string>`COALESCE(avg(${reviews.activitiesRating})::numeric(2,1), 0)`,
      avgValue: sql<string>`COALESCE(avg(${reviews.valueRating})::numeric(2,1), 0)`,
      recommendPercentage: sql<number>`COALESCE(
        (count(*) FILTER (WHERE ${reviews.wouldRecommend} = true) * 100.0 /
        NULLIF(count(*) FILTER (WHERE ${reviews.wouldRecommend} IS NOT NULL), 0))::int,
        0
      )`,
    })
    .from(reviews)
    .where(eq(reviews.facilityId, facilityId));

  // Rating distribution
  const distribution = await db
    .select({
      rating: reviews.overallRating,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.facilityId, facilityId))
    .groupBy(reviews.overallRating);

  const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) {
    distributionMap[d.rating] = d.count;
  }

  return c.json({
    avgRating: stats.avgRating,
    totalCount: stats.totalCount,
    distribution: distributionMap,
    categoryAverages: {
      safety: stats.avgSafety,
      staff: stats.avgStaff,
      activities: stats.avgActivities,
      value: stats.avgValue,
    },
    recommendPercentage: stats.recommendPercentage,
  });
});

app.get("/", async (c) => {
  const facilityId = c.req.query("facilityId");
  const sort = c.req.query("sort") || "newest";
  const rating = c.req.query("rating");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);

  if (!facilityId) {
    return c.json({ error: "facilityId is required" }, 400);
  }

  const conditions: any[] = [eq(reviews.facilityId, facilityId)];

  if (rating) {
    conditions.push(eq(reviews.overallRating, parseInt(rating, 10)));
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

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(...conditions));

  const totalCount = countResult?.count ?? 0;

  const reviewList = await db
    .select({
      id: reviews.id,
      overallRating: reviews.overallRating,
      safetyRating: reviews.safetyRating,
      staffRating: reviews.staffRating,
      activitiesRating: reviews.activitiesRating,
      valueRating: reviews.valueRating,
      title: reviews.title,
      body: reviews.body,
      wouldRecommend: reviews.wouldRecommend,
      createdAt: reviews.createdAt,
      parentId: reviews.parentId,
      parentName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.parentId, users.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Batch-load review responses
  if (reviewList.length > 0) {
    const reviewIds = reviewList.map((r) => r.id);
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
      .where(
        sql`${reviewResponses.reviewId} IN (${sql.join(
          reviewIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const responseMap = new Map<string, any>();
    for (const resp of responses) {
      responseMap.set(resp.reviewId, resp);
    }

    const reviewsWithResponses = reviewList.map((r) => ({
      ...r,
      response: responseMap.get(r.id) || null,
    }));

    return c.json({
      reviews: reviewsWithResponses,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  }

  return c.json({
    reviews: reviewList,
    totalCount,
    hasMore: offset + limit < totalCount,
  });
});

app.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();

  // Check eligibility
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(children.parentId, userId),
        eq(enrollments.facilityId, body.facilityId),
        sql`${enrollments.status} IN ('active', 'approved', 'withdrawn')`
      )
    )
    .limit(1);

  if (!enrollment) {
    return c.json({ error: "You must have an enrollment to review this facility" }, 403);
  }

  // Check no existing review
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.facilityId, body.facilityId), eq(reviews.parentId, userId)))
    .limit(1);

  if (existing) {
    return c.json({ error: "You have already reviewed this facility" }, 400);
  }

  const [review] = await db
    .insert(reviews)
    .values({
      facilityId: body.facilityId,
      parentId: userId,
      overallRating: body.overallRating,
      safetyRating: body.safetyRating,
      staffRating: body.staffRating,
      activitiesRating: body.activitiesRating,
      valueRating: body.valueRating,
      title: body.title,
      body: body.body,
      wouldRecommend: body.wouldRecommend,
    })
    .returning();

  await recalculateFacilityRating(body.facilityId);

  // Notify facility owner
  const [facility] = await db
    .select({ ownerId: facilities.ownerId, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, body.facilityId))
    .limit(1);

  if (facility) {
    await sendNotification({
      type: "new_review",
      recipientId: facility.ownerId,
      data: {
        reviewId: review.id,
        facilityName: facility.name,
        rating: review.overallRating,
      },
      actionUrl: `/admin/reviews`,
    });
  }

  return c.json(review);
});

app.put("/:reviewId", async (c) => {
  const userId = c.get("userId") as string;
  const reviewId = c.req.param("reviewId");
  const body = await c.req.json();

  const [existing] = await db
    .select({ id: reviews.id, facilityId: reviews.facilityId })
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.parentId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Review not found" }, 404);
  }

  const [updated] = await db
    .update(reviews)
    .set({
      overallRating: body.overallRating,
      safetyRating: body.safetyRating,
      staffRating: body.staffRating,
      activitiesRating: body.activitiesRating,
      valueRating: body.valueRating,
      title: body.title,
      body: body.body,
      wouldRecommend: body.wouldRecommend,
      updatedAt: new Date(),
    })
    .where(eq(reviews.id, reviewId))
    .returning();

  await recalculateFacilityRating(existing.facilityId);

  return c.json(updated);
});

app.delete("/:reviewId", async (c) => {
  const userId = c.get("userId") as string;
  const reviewId = c.req.param("reviewId");

  const [existing] = await db
    .select({ id: reviews.id, facilityId: reviews.facilityId })
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.parentId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Review not found" }, 404);
  }

  await db.delete(reviews).where(eq(reviews.id, reviewId));

  await recalculateFacilityRating(existing.facilityId);

  return c.json({ success: true });
});

app.post("/:reviewId/report", async (c) => {
  const reviewId = c.req.param("reviewId");

  await db
    .update(reviews)
    .set({ isReported: true })
    .where(eq(reviews.id, reviewId));

  return c.json({ success: true });
});

app.post("/:reviewId/response", async (c) => {
  const userId = c.get("userId") as string;
  const reviewId = c.req.param("reviewId");
  const body = await c.req.json();

  // Get the review to find the facility
  const [review] = await db
    .select({ id: reviews.id, facilityId: reviews.facilityId, parentId: reviews.parentId })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  await assertFacilityPermission(review.facilityId, userId, "reviews:manage");

  const [response] = await db
    .insert(reviewResponses)
    .values({
      reviewId,
      responderId: userId,
      body: body.body,
    })
    .returning();

  // Notify reviewer
  const [facility] = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, review.facilityId))
    .limit(1);

  await sendNotification({
    type: "review_response",
    recipientId: review.parentId,
    data: {
      reviewId,
      facilityName: facility?.name,
    },
    actionUrl: `/reviews/${reviewId}`,
  });

  return c.json(response);
});

app.put("/responses/:responseId", async (c) => {
  const userId = c.get("userId") as string;
  const responseId = c.req.param("responseId");
  const body = await c.req.json();

  // Get the response to find the review and facility
  const [response] = await db
    .select({
      id: reviewResponses.id,
      reviewId: reviewResponses.reviewId,
    })
    .from(reviewResponses)
    .where(eq(reviewResponses.id, responseId))
    .limit(1);

  if (!response) {
    return c.json({ error: "Response not found" }, 404);
  }

  const [review] = await db
    .select({ facilityId: reviews.facilityId })
    .from(reviews)
    .where(eq(reviews.id, response.reviewId))
    .limit(1);

  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  await assertFacilityPermission(review.facilityId, userId, "reviews:manage");

  const [updated] = await db
    .update(reviewResponses)
    .set({ body: body.body, updatedAt: new Date() })
    .where(eq(reviewResponses.id, responseId))
    .returning();

  return c.json(updated);
});

app.get("/mine", async (c) => {
  const userId = c.get("userId") as string;

  const myReviews = await db
    .select({
      id: reviews.id,
      facilityId: reviews.facilityId,
      facilityName: facilities.name,
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
    })
    .from(reviews)
    .innerJoin(facilities, eq(reviews.facilityId, facilities.id))
    .where(eq(reviews.parentId, userId))
    .orderBy(desc(reviews.createdAt));

  // Batch-load responses
  if (myReviews.length > 0) {
    const reviewIds = myReviews.map((r) => r.id);
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
      .where(
        sql`${reviewResponses.reviewId} IN (${sql.join(
          reviewIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const responseMap = new Map<string, any>();
    for (const resp of responses) {
      responseMap.set(resp.reviewId, resp);
    }

    const reviewsWithResponses = myReviews.map((r) => ({
      ...r,
      response: responseMap.get(r.id) || null,
    }));

    return c.json(reviewsWithResponses);
  }

  return c.json(myReviews);
});

app.get("/admin/:facilityId", async (c) => {
  const userId = c.get("userId") as string;
  const facilityId = c.req.param("facilityId");

  await assertFacilityPermission(facilityId, userId, "reviews:manage");

  const facilityReviews = await db
    .select({
      id: reviews.id,
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
      parentId: reviews.parentId,
      parentName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.parentId, users.id))
    .where(eq(reviews.facilityId, facilityId))
    .orderBy(desc(reviews.createdAt));

  // Batch-load responses
  if (facilityReviews.length > 0) {
    const reviewIds = facilityReviews.map((r) => r.id);
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
      .where(
        sql`${reviewResponses.reviewId} IN (${sql.join(
          reviewIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    const responseMap = new Map<string, any>();
    for (const resp of responses) {
      responseMap.set(resp.reviewId, resp);
    }

    const reviewsWithResponses = facilityReviews.map((r) => ({
      ...r,
      response: responseMap.get(r.id) || null,
    }));

    return c.json(reviewsWithResponses);
  }

  return c.json(facilityReviews);
});

export { app as reviewsRoutes };
