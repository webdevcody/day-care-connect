import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../auth";
import {
  db,
  facilities,
  facilityServices,
  facilityPhotos,
  facilityHours,
  enrollments,
  favorites,
  sql,
  eq,
  and,
  isNotNull,
} from "@daycare-hub/db";
import type { FacilitySearchInput } from "@daycare-hub/shared";

export const searchFacilities = createServerFn({ method: "GET" })
  .inputValidator((data: FacilitySearchInput) => data)
  .handler(async ({ data }) => {
    const { lat, lng, radius, age, maxPrice, services, available, openBefore, minRating, sort, page, limit } =
      data;

    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers }).catch(() => null);
    const userId = session?.user?.id;

    const offset = (page - 1) * limit;

    // Haversine distance in miles
    const distanceSql = sql<number>`(
      3959 * acos(
        cos(radians(${lat}))
        * cos(radians(CAST(${facilities.latitude} AS double precision)))
        * cos(radians(CAST(${facilities.longitude} AS double precision)) - radians(${lng}))
        + sin(radians(${lat}))
        * sin(radians(CAST(${facilities.latitude} AS double precision)))
      )
    )`;

    // Available spots subquery
    const availableSpotsSql = sql<number>`(
      ${facilities.capacity} - COALESCE((
        SELECT COUNT(*)::int FROM enrollments
        WHERE enrollments.facility_id = ${facilities.id}
        AND enrollments.status = 'active'
      ), 0)
    )`;

    // Is favorited subquery
    const isFavoritedSql = userId
      ? sql<boolean>`EXISTS(
          SELECT 1 FROM favorites
          WHERE favorites.facility_id = ${facilities.id}
          AND favorites.user_id = ${userId}
        )`
      : sql<boolean>`false`;

    // Primary photo subquery
    const primaryPhotoSql = sql<string | null>`(
      SELECT url FROM facility_photos
      WHERE facility_photos.facility_id = ${facilities.id}
      ORDER BY sort_order ASC
      LIMIT 1
    )`;

    // Build WHERE conditions
    const conditions = [
      eq(facilities.isActive, true),
      isNotNull(facilities.latitude),
      isNotNull(facilities.longitude),
      sql`${distanceSql} <= ${radius}`,
    ];

    if (age !== undefined) {
      conditions.push(sql`${facilities.ageRangeMin} <= ${age}`);
      conditions.push(sql`${facilities.ageRangeMax} >= ${age}`);
    }

    if (maxPrice !== undefined) {
      conditions.push(sql`CAST(${facilities.monthlyRate} AS numeric) <= ${maxPrice}`);
    }

    if (services && services.length > 0) {
      for (const service of services) {
        conditions.push(
          sql`EXISTS(
            SELECT 1 FROM facility_services
            WHERE facility_services.facility_id = ${facilities.id}
            AND facility_services.service_name = ${service}
          )`
        );
      }
    }

    if (available) {
      conditions.push(sql`${availableSpotsSql} > 0`);
    }

    if (openBefore) {
      conditions.push(
        sql`EXISTS(
          SELECT 1 FROM facility_hours
          WHERE facility_hours.facility_id = ${facilities.id}
          AND facility_hours.open_time <= ${openBefore}::time
        )`
      );
    }

    if (minRating !== undefined) {
      conditions.push(sql`CAST(${facilities.ratingAverage} AS numeric) >= ${minRating}`);
    }

    const whereClause = and(...conditions);

    // Order by
    let orderBy;
    switch (sort) {
      case "price_asc":
        orderBy = sql`CAST(${facilities.monthlyRate} AS numeric) ASC NULLS LAST`;
        break;
      case "price_desc":
        orderBy = sql`CAST(${facilities.monthlyRate} AS numeric) DESC NULLS LAST`;
        break;
      case "rating_desc":
        orderBy = sql`CAST(${facilities.ratingAverage} AS numeric) DESC NULLS LAST`;
        break;
      default:
        orderBy = sql`${distanceSql} ASC`;
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(facilities)
      .where(whereClause);

    // Get paginated results
    const results = await db
      .select({
        id: facilities.id,
        name: facilities.name,
        address: facilities.address,
        city: facilities.city,
        state: facilities.state,
        zipCode: facilities.zipCode,
        latitude: facilities.latitude,
        longitude: facilities.longitude,
        capacity: facilities.capacity,
        ageRangeMin: facilities.ageRangeMin,
        ageRangeMax: facilities.ageRangeMax,
        monthlyRate: facilities.monthlyRate,
        ratingAverage: facilities.ratingAverage,
        reviewCount: facilities.reviewCount,
        distance: distanceSql.as("distance"),
        availableSpots: availableSpotsSql.as("available_spots"),
        isFavorited: isFavoritedSql.as("is_favorited"),
        primaryPhotoUrl: primaryPhotoSql.as("primary_photo_url"),
      })
      .from(facilities)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Batch-load services for result set
    const facilityIds = results.map((r) => r.id);
    let servicesMap: Record<string, string[]> = {};
    if (facilityIds.length > 0) {
      const allServices = await db
        .select({
          facilityId: facilityServices.facilityId,
          serviceName: facilityServices.serviceName,
        })
        .from(facilityServices)
        .where(sql`${facilityServices.facilityId} IN ${facilityIds}`);

      for (const s of allServices) {
        if (!servicesMap[s.facilityId]) servicesMap[s.facilityId] = [];
        servicesMap[s.facilityId].push(s.serviceName);
      }
    }

    const facilitiesWithServices = results.map((f) => ({
      ...f,
      services: servicesMap[f.id] || [],
    }));

    return {
      facilities: facilitiesWithServices,
      totalCount: total,
      hasMore: offset + limit < total,
    };
  });
