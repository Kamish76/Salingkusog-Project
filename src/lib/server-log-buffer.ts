export type SubsystemType = "database" | "storage" | "auth" | "moderation" | "system";
export type LogLevel = "error" | "warn" | "info";

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  subsystem: SubsystemType;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown> | string;
}

const MAX_BUFFER_SIZE = 100;

// Use globalThis to persist ring buffer across module re-evaluations
const globalForLogs = globalThis as unknown as {
  __serverLogBuffer?: DiagnosticLogEntry[];
};

const buffer: DiagnosticLogEntry[] = globalForLogs.__serverLogBuffer ?? [];
globalForLogs.__serverLogBuffer = buffer;

let logCounter = 0;

export function pushDiagnosticLog(
  entry: Omit<DiagnosticLogEntry, "id" | "timestamp">
): DiagnosticLogEntry {
  logCounter += 1;
  const newEntry: DiagnosticLogEntry = {
    id: `diag-${Date.now()}-${logCounter}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Prepend newest entry to head
  buffer.unshift(newEntry);

  // Evict oldest entries exceeding capacity
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.length = MAX_BUFFER_SIZE;
  }

  return newEntry;
}

export function getRecentDiagnosticLogs(
  limit = 50,
  filterSubsystem?: SubsystemType
): DiagnosticLogEntry[] {
  let list = buffer;
  if (filterSubsystem) {
    list = list.filter((item) => item.subsystem === filterSubsystem);
  }
  return list.slice(0, Math.min(limit, MAX_BUFFER_SIZE));
}

export function clearDiagnosticLogs(): void {
  buffer.length = 0;
}
