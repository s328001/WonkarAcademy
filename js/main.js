/* ===== EDIT HERE: everything the owner may change is in this block ===== */
const NUMBER  = "918005580438";          // WhatsApp number: 91 + 10 digits, no + or spaces
const PHONE   = "+918005580438";         // number for the Call button
const PHONE_TEXT = "+91 80055 80438";    // how the number is shown on the page
const WEB3FORMS_KEY = "6ead9203-c4f5-4ca9-a80c-3c81cf636eb4";  // Web3Forms access key: free trial bookings go to the academy email (empty = WhatsApp only)
const UPI_ID  = "8209626562@ybl";        // academy UPI ID
const PAYEE   = "Wonkar Table Tennis Academy";  // name shown in the UPI app (confirm with owner)
const ADDRESS = "Plot no. 55 and 56, Vinayak Nagar, Raj Maharana Pratap Marg, opposite Rangoli Gardens, Vaishali Nagar, Jaipur, Rajasthan 302034";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=Wonkar+Table+Tennis+Academy+Plot+no.+55+and+56%2C+Vinayak+Nagar%2C+Raj+Maharana+Pratap+Marg%2C+opposite+Rangoli+Gardens%2C+Vaishali+Nagar%2C+Jaipur%2C+Rajasthan+302034";
const HOURS   = "Mon to Sat: 6 to 9 AM and 5 to 9 PM. Sunday: closed.";
const TIMINGS = [                        // batch, days, time (SAMPLES: owner to confirm)
  ["Beginners",         "Mon to Sat", "6:00 to 7:00 AM"],
  ["Amateurs",          "Mon to Sat", "5:00 to 7:00 PM"],
  ["Corporate players", "Mon to Sat", "7:00 to 9:00 PM"]
];
const FEES = [                           // plan name, amount in rupees (SAMPLES)
  ["Monthly (3 days a week)", 1500],
  ["Monthly (6 days a week)", 2500],
  ["3 months (3 days a week)", 4000]
];
/* ===== end of edit block ===== */

const $ = id => document.getElementById(id);
const rupee = n => "₹" + n.toLocaleString("en-IN");
const wa = text => "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(text);

$("yr").textContent = new Date().getFullYear();
$("timingRows").innerHTML = TIMINGS.map(t => "<tr><td>" + t.join("</td><td>") + "</td></tr>").join("");
$("feeRows").innerHTML = FEES.map(f => "<tr><td>" + f[0] + '</td><td class="price">' + rupee(f[1]) + "</td></tr>").join("");
$("batchSel").innerHTML = TIMINGS.map(t => "<option>" + t[0] + " (" + t[1] + ", " + t[2] + ")</option>").join("");
$("planSel").innerHTML = FEES.map((f, i) => '<option value="' + i + '">' + f[0] + " - " + rupee(f[1]) + "</option>").join("");
$("callLink").href = "tel:" + PHONE;
$("callLink").textContent = "Call " + PHONE_TEXT;
document.querySelectorAll(".waTalk").forEach(a => { a.href = wa("Hello, I would like to know about table tennis coaching."); a.textContent = "WhatsApp us: " + PHONE_TEXT; });
$("waLink").href = wa("Hello, I would like to know about table tennis coaching.");
$("hours").textContent = HOURS;
$("addr").textContent = ADDRESS;
$("mapLink").href = MAP_URL;
$("upiShow").textContent = UPI_ID;
$("shotLink").href = wa("Hello, I have paid the fees. Screenshot attached.");

async function sendEmail(subject, data) {
  const r = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(Object.assign({ access_key: WEB3FORMS_KEY, subject: subject, from_name: "Wonkar Table Tennis Academy website" }, data))
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.message || "failed");
}
(function(){
  const form = $("applyForm"), done = $("applyDone"), err = $("applyErr"), send = $("applySend");
  const msgOf = f => "Application for coaching\nParent: " + (f.get("parent") || "-") + "\nPlayer: " + f.get("player") +
    "\nAge: " + f.get("age") + "\nBatch: " + f.get("batch") + "\nPhone: " + f.get("phone");
  $("applyAgain").addEventListener("click", () => { form.reset(); form.hidden = false; done.hidden = true; send.disabled = false; send.textContent = "Send application"; });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(form);
    if (!WEB3FORMS_KEY) { window.location.href = wa(msgOf(f)); return; }
    err.hidden = true; send.disabled = true; send.textContent = "Sending...";
    try {
      await sendEmail("New coaching application", { form: "Coaching application", parent_name: f.get("parent") || "-", child_name: f.get("player"), child_age: f.get("age"), phone: f.get("phone"), email: undefined, batch: f.get("batch"), botcheck: f.get("botcheck") ? "yes" : "" });
      form.hidden = true; done.hidden = false;
    } catch (x) {
      err.textContent = "Sorry, we could not send this. Please check your connection and try again, or WhatsApp us.";
      err.hidden = false; send.disabled = false; send.textContent = "Send application";
    }
  });
})();

(function(){
  const dlg = $("trialDlg"), form = $("trialForm"), done = $("trialDone"), err = $("trialErr"), send = $("trialSend");
  const trialMsg = f => "Free trial class booking\nParent: " + (f.get("name") || "-") + "\nChild/player: " + f.get("child") + "\nAge: " + f.get("age") + "\nPhone: " + f.get("phone") +
    "\nEmail: " + (f.get("email") || "-");
  const reset = () => { form.hidden = false; done.hidden = true; err.hidden = true; send.disabled = false; send.textContent = "Book a free trial"; };
  document.querySelectorAll("[data-trial]").forEach(b => b.addEventListener("click", () => { reset(); dlg.showModal(); }));
  $("trialX").addEventListener("click", () => dlg.close());
  $("trialClose").addEventListener("click", () => { dlg.close(); form.reset(); });
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(form);
    if (!WEB3FORMS_KEY) { dlg.close(); window.location.href = wa(trialMsg(f)); return; }
    err.hidden = true; send.disabled = true; send.textContent = "Sending...";
    try {
      await sendEmail("New free trial booking", { form: "Free trial", parent_name: f.get("name") || "-", child_name: f.get("child"), child_age: f.get("age"), phone: f.get("phone"), email: f.get("email") || undefined, batch: undefined, botcheck: f.get("botcheck") ? "yes" : "" });
      form.hidden = true; done.hidden = false;
    } catch (x) {
      err.textContent = "Sorry, we could not send this. Please check your connection and try again, or WhatsApp us.";
      err.hidden = false; send.disabled = false; send.textContent = "Book a free trial";
    }
  });
})();

function updatePay() {
  const plan = FEES[$("planSel").value];
  $("amt").textContent = rupee(plan[1]);
  $("upiLink").href = "upi://pay?pa=" + encodeURIComponent(UPI_ID) + "&pn=" + encodeURIComponent(PAYEE) +
    "&am=" + plan[1] + "&cu=INR&tn=" + encodeURIComponent("Fees: " + plan[0]);
}
$("planSel").addEventListener("change", updatePay);
updatePay();

$("copyBtn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(UPI_ID); $("copyBtn").textContent = "Copied!"; }
  catch (_) { $("copyBtn").textContent = "Long-press the ID to copy"; }
  setTimeout(() => $("copyBtn").textContent = "Copy UPI ID", 2500);
});

const qr = $("qr");
qr.addEventListener("load", () => { qr.hidden = false; $("qrPh").hidden = true; });
if (qr.complete && qr.naturalWidth) { qr.hidden = false; $("qrPh").hidden = true; }
(function(){
  var lb=document.getElementById('lightbox'); if(!lb||!lb.showModal) return;
  var big=lb.querySelector('img'), cap=lb.querySelector('p');
  document.querySelectorAll('.gallery figure').forEach(function(f){
    f.querySelector('button').addEventListener('click',function(){
      var im=f.querySelector('img');
      big.src=im.src; big.alt=im.alt; cap.textContent=f.querySelector('figcaption').textContent;
      lb.showModal();
    });
  });
  lb.querySelector('.close').addEventListener('click',function(){lb.close()});
  lb.addEventListener('click',function(e){ if(e.target===lb||e.target===big) lb.close(); });
})();
