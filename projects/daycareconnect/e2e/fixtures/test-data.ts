import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function storagePath(name: string) {
  return path.join(__dirname, `../.auth/${name}.json`);
}

export const USERS = {
  parent: {
    email: "parent@example.com",
    password: "12345678",
    name: "Parent User",
    dashboardPath: "/parent",
    storageStatePath: storagePath("parent"),
  },
  admin: {
    email: "facility@example.com",
    password: "12345678",
    name: "Facility Owner",
    dashboardPath: "/facility",
    storageStatePath: storagePath("admin"),
  },
  staff: {
    email: "staff@example.com",
    password: "12345678",
    name: "Staff Member",
    dashboardPath: "/staff",
    storageStatePath: storagePath("staff"),
  },
} as const;

export const FACILITY = {
  name: "Sunshine Kids Academy",
  address: "123 Elm Street",
  city: "Springfield",
  state: "IL",
  zipCode: "62701",
} as const;

export const CHILD = {
  firstName: "Alex",
  lastName: "User",
  dateOfBirth: "2022-03-15",
} as const;
