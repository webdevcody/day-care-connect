CREATE TABLE IF NOT EXISTS "facility_staff_permissions" (
	"facility_staff_id" uuid NOT NULL REFERENCES "facility_staff"("id") ON DELETE CASCADE,
	"permission" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facility_staff_permissions_facility_staff_id_permission_pk" PRIMARY KEY("facility_staff_id","permission")
);
