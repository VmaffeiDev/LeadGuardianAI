import {
  scheduleIdleScan,
  createIdleScanWorker,
  scheduleStartPendingTriages,
  createStartTriagesWorker,
  scheduleTriageTimeouts,
  createTriageTimeoutsWorker,
  createWhatsappClassifyWorker,
} from "./queue";
import { runIdleLeadsScan } from "./jobs/scanIdleLeads";
import { runStartPendingTriages } from "./jobs/startPendingTriages";
import { runTriageTimeouts } from "./jobs/triageTimeouts";
import { runClassifyReply } from "./jobs/classifyReply";

async function main() {
  await Promise.all([scheduleIdleScan(), scheduleStartPendingTriages(), scheduleTriageTimeouts()]);

  const workers = [
    createIdleScanWorker(runIdleLeadsScan),
    createStartTriagesWorker(runStartPendingTriages),
    createTriageTimeoutsWorker(runTriageTimeouts),
    createWhatsappClassifyWorker(runClassifyReply),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, err) => {
      console.error(`[worker] job ${job?.id} (${worker.name}) falhou:`, err);
    });
  }

  console.log(
    "[worker] LeadGuardianAI worker iniciado — leads parados a cada 30s, triagens WhatsApp a cada 1min, timeouts a cada 15min",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
