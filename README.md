# Wonkar Table Tennis Academy website

A fast, mobile-friendly, single-page website for **Wonkar Table Tennis Academy**, Vaishali Nagar, Jaipur.
It is plain HTML, CSS and JavaScript. There is nothing to install or build.

## Features

- Cover section with academy photo, "Book a free trial" and "Apply for coaching" buttons
- Programs, photo gallery (tap a photo to enlarge), batch timings, fees and FAQs
- **Free trial pop-up** and **Apply for coaching** form. Details are emailed to the academy through Web3Forms
- **Pay fees** by UPI (GPay, PhonePe, Paytm) with a copy-UPI-ID button
- "Prefer to talk? WhatsApp us" and Call buttons
- Fully responsive, from small phones to desktop

## Project structure

```
index.html        page content
css/styles.css    all styles (colours and fonts are at the top)
js/main.js        owner settings block + form and pop-up scripts
images/           cover photo, gallery photos, logo
```

## Run it on your computer

Any static file server works. For example, with Python:

```bash
python3 -m http.server 8123
```

Then open <http://localhost:8123>.

## What the owner can edit

Open **`js/main.js`**. Everything that changes over time is in the block at the top, marked
`EDIT HERE`:

| Setting | What it controls |
|---|---|
| `NUMBER`, `PHONE`, `PHONE_TEXT` | WhatsApp number, call number, and how the number is displayed |
| `WEB3FORMS_KEY` | Access key that sends form submissions to the academy email. If empty, forms fall back to WhatsApp |
| `UPI_ID`, `PAYEE` | UPI ID and the name shown in the UPI app |
| `ADDRESS`, `MAP_URL`, `HOURS` | Address, Google Maps link and opening hours |
| `TIMINGS` | Batch name, days and time |
| `FEES` | Plan name and amount in rupees |

Other content:

- **Text, FAQs and section order:** `index.html`
- **Colours:** the first lines of `css/styles.css` (the `:root` variables)
- **Photos:** replace the files in `images/` using the same file names, so nothing else needs to change
- **UPI QR code:** save the QR image as `qr.png` in the project root and it appears automatically in the Pay section

## Form emails (Web3Forms)

Both forms send the same fields: `parent_name`, `child_name`, `child_age`, `phone`, `email`, `batch` and `form`
(Free trial or Coaching application).

1. Create a free access key at <https://web3forms.com> and paste it into `WEB3FORMS_KEY`.
2. In the Web3Forms dashboard, set the website address to the live site address.
   Submissions from other addresses may be rejected.
3. To get a clean CSV, use a fresh access key. Web3Forms keeps every field name it has ever received as a column.

## Hosting

The site is static, so it can be hosted free on **Netlify**, **GitHub Pages** or **Cloudflare Pages**.
Upload or publish the whole folder: `index.html`, `css/`, `js/` and `images/`.

- **Netlify:** drag the folder onto <https://app.netlify.com/drop>, or connect this repository so every push updates the site.
- **GitHub Pages:** Settings, then Pages, then deploy from the `main` branch. Free Pages hosting needs a public repository.

## To do before launch

- [ ] Replace sample batch timings and fees in `js/main.js`, then remove the "Sample timings" and "Sample fees" notes in `index.html`
- [ ] Replace the Instagram screenshots in `images/` with the original high-resolution photos
- [ ] Add a preview image for link sharing (the `og:image` tag in `index.html`) once the site is live
- [ ] Add the UPI QR image as `qr.png`
- [ ] Update the Web3Forms website address to the live site address
- [ ] Send a test booking from both forms and confirm the emails arrive

## Credits

- Font: [Poppins](https://fonts.google.com/specimen/Poppins) (SIL Open Font License), loaded from Google Fonts
- Logo and photos belong to Wonkar Table Tennis Academy
