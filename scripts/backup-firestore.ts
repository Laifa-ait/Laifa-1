import { exec } from "child_process";
import { promisify } from "util";
import { format } from "date-fns";

const execAsync = promisify(exec);

async function backupFirestore() {
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
  const bucket = `gs://olmart-backups/firestore/${timestamp}`;
  
  try {
    const { stdout, stderr } = await execAsync(
      `gcloud firestore export ${bucket} --project=original-micron-7sjh2`
    );
    console.log(`Backup réussi : ${bucket}`);
    console.log(stdout);
  } catch (error) {
    console.error("Backup échoué :", error);
    process.exit(1);
  }
}

backupFirestore();
