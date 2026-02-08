import {
  db,
  conversationParticipants,
  children,
  enrollments,
  eq,
  and,
  sql,
} from "@daycare-hub/db";

export async function assertConversationParticipant(
  conversationId: string,
  userId: string
) {
  const [participant] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);

  if (!participant) throw new Error("Not a participant in this conversation");
  return participant;
}

export async function assertParentCanMessageFacility(
  parentId: string,
  facilityId: string
) {
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(children, eq(enrollments.childId, children.id))
    .where(
      and(
        eq(children.parentId, parentId),
        eq(enrollments.facilityId, facilityId),
        sql`${enrollments.status} IN ('active', 'approved')`
      )
    )
    .limit(1);

  if (!enrollment)
    throw new Error(
      "You must have an active enrollment to message this facility"
    );
  return enrollment;
}
