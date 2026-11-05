function showTransactionReceiptActions(containerId, transaction, details = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();
  container.hidden = false;
  container.classList.add("transaction-receipt-actions");

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "btn btn-outline receipt-download-button";
  downloadButton.textContent = "Download PDF receipt";

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "btn btn-quiet receipt-share-button";
  shareButton.textContent = "Share receipt";

  const status = document.createElement("span");
  status.className = "receipt-action-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  downloadButton.addEventListener("click", () => {
    const file = createTransactionReceiptPdf(transaction, details);
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = receiptFileName(transaction.transactionRef);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "PDF receipt downloaded.";
  });

  shareButton.addEventListener("click", async () => {
    const file = createTransactionReceiptPdf(transaction, details);
    const fileName = receiptFileName(transaction.transactionRef);
    const pdfFile = typeof File === "undefined" ? null : new File([file], fileName, { type: "application/pdf" });
    if (pdfFile && navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: "Apna Bank transaction receipt", text: `Receipt for transaction ${transaction.transactionRef}` });
        status.textContent = "Receipt shared.";
      } catch (error) {
        if (error.name !== "AbortError") status.textContent = "Could not share the receipt.";
      }
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "PDF downloaded. Attach it to a message to share.";
  });

  container.append(downloadButton, shareButton, status);
}

function createTransactionReceiptPdf(transaction, details = {}) {
  const user = Auth.getUser();
  const transactionType = String(transaction.type || details.type || "TRANSACTION").replaceAll("_", " ");
  const date = transaction.createdAt ? formatDateTime(transaction.createdAt) : new Date().toLocaleString("en-IN");
  const lines = [
    "APNA BANK",
    "TRANSACTION RECEIPT",
    "",
    `Customer: ${user?.fullName || user?.username || "Customer"}`,
    `Transaction type: ${transactionType}`,
    `Status: ${transaction.status || "SUCCESS"}`,
    `Amount: INR ${Number(transaction.amount || 0).toFixed(2)}`,
    `Transaction reference: ${transaction.transactionRef || "-"}`,
    `Date and time: ${date}`,
    `Description: ${transaction.description || details.description || "-"}`,
    `From account: ${maskReceiptAccount(transaction.fromAccountNumber || details.accountNumber)}`,
    `To account: ${maskReceiptAccount(transaction.toAccountNumber)}`,
  ];

  if (transaction.beneficiaryName) lines.push(`Beneficiary: ${transaction.beneficiaryName}`);
  if (transaction.beneficiaryBankName) lines.push(`Beneficiary bank: ${transaction.beneficiaryBankName}`);
  if (details.billId) lines.push(`Bill ID: ${details.billId}`);
  if (details.provider) lines.push(`Biller: ${details.provider}`);
  if (transaction.balanceAfter != null) lines.push(`Available balance after: INR ${Number(transaction.balanceAfter).toFixed(2)}`);
  if (transaction.status === "SIMULATED") lines.push("Note: This external transfer was simulated; no funds were sent to another bank.");
  if (details.disclaimer) lines.push(details.disclaimer);
  lines.push("", "Keep this receipt for your records.", "Apna Bank | 24x7 support: 1800 258 0000");

  return buildSimplePdf(lines);
}

function buildSimplePdf(lines) {
  const safeLines = lines.map((line) => pdfSafeText(line).slice(0, 100));
  const content = ["BT", "/F1 11 Tf", "50 790 Td"];
  safeLines.forEach((line, index) => {
    if (index > 0) content.push("0 -24 Td");
    if (index === 0) content.push("/F1 20 Tf");
    if (index === 1) content.push("/F1 12 Tf");
    if (index === 2) content.push("/F1 11 Tf");
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function pdfSafeText(value) {
  return String(value ?? "")
    .replaceAll("₹", "INR ")
    .replaceAll("×", "x")
    .replaceAll("·", "-")
    .replaceAll("—", "-")
    .replaceAll("–", "-")
    .replaceAll("−", "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value) {
  return value.replace(/[\\()]/g, "\\$&");
}

function receiptFileName(reference) {
  const safeReference = String(reference || "transaction").replace(/[^A-Za-z0-9_-]/g, "-");
  return `Apna-Bank-Receipt-${safeReference}.pdf`;
}

function maskReceiptAccount(accountNumber) {
  if (!accountNumber) return "-";
  const value = String(accountNumber);
  return value.length <= 4 ? value : `${"X".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}
