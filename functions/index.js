const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { google } = require("googleapis");

const PROJECT_ID = "usc-club-dc312";
const PROJECT_NAME = `projects/${PROJECT_ID}`;

exports.billingKillSwitch = onMessagePublished(
  { topic: "billing-kill-switch", region: "us-central1" },
  async (event) => {
    const payload = event.data.message.json;
    const costAmount = Number(payload?.costAmount ?? 0);

    console.log(`Budget notification: cost=${costAmount} budget=${payload?.budgetAmount}`);

    if (costAmount <= 0) {
      console.log("No real spend yet, nothing to do.");
      return;
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-billing"],
    });
    const billing = google.cloudbilling({ version: "v1", auth });

    const current = await billing.projects.getBillingInfo({ name: PROJECT_NAME });
    if (!current.data.billingEnabled) {
      console.log("Billing is already disabled.");
      return;
    }

    await billing.projects.updateBillingInfo({
      name: PROJECT_NAME,
      requestBody: { billingAccountName: "" },
    });

    console.log(`Billing disabled for ${PROJECT_ID} — real spend of ${costAmount} detected.`);
  }
);
