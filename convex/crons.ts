import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process recurring transactions every day at midnight UTC
crons.daily(
  "process recurring transactions",
  { hourUTC: 0, minuteUTC: 0 },
  internal.recurring.processAll
);

export default crons;
