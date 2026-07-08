import { scheduleIdleScan, createIdleScanWorker } from "./queue";
import { runIdleLeadsScan } from "./jobs/scanIdleLeads";

async function main() {
  await scheduleIdleScan();

  const worker = createIdleScanWorker(async () => {
    await runIdleLeadsScan();
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} falhou:`, err);
  });

  console.log("[worker] LeadGuardianAI worker iniciado, varrendo leads a cada 30s");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
