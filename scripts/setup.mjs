// Creates the database and fills it with example accounts and papers.
//   npm run setup   -> create tables (if missing) and load example data
//   npm run reset   -> delete everything and start fresh
// Both commands replace existing data with the examples.
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { migrate } from "../db/migrate.mjs";

const ROOT = process.cwd();

// Read .env (plain Node doesn't do this by itself)
const env = {};
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* no .env: use defaults */ }
const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL || "file:data/papr.db";
const DOI_PREFIX = process.env.DOI_PREFIX || env.DOI_PREFIX || "10.99999";
const UPLOADS = path.join(ROOT, "uploads");

// The demo data replaces everything in the database, so it only runs on a local file database.
if (!DATABASE_URL.startsWith("file:")) { console.error("npm run setup only works with a local database (DATABASE_URL=file:...). Your live Turso database sets itself up automatically."); process.exit(1); }
if (DATABASE_URL.startsWith("file:")) fs.mkdirSync(path.dirname(path.resolve(ROOT, DATABASE_URL.slice(5))), { recursive: true });
const db = createClient({ url: DATABASE_URL });
const id = () => crypto.randomUUID();
const iso = (d) => new Date(d).toISOString();
const run = (sql, args = []) => db.execute({ sql, args });

// Builds a small, valid one-page PDF so downloads work during testing.
function makePdf(title, authors, abstract = "") {
  const clean = (s) => s.replace(/[^\x20-\x7E]/g, "-").replace(/[\\()]/g, (m) => "\\" + m);
  const wrap = (s, n) => {
    const out = []; let line = "";
    for (const w of s.split(" ")) { if ((line + " " + w).trim().length > n) { out.push(line.trim()); line = w; } else line += " " + w; }
    if (line.trim()) out.push(line.trim());
    return out;
  };
  let c = "BT /F1 18 Tf 72 720 Td 24 TL ";
  for (const l of wrap(title, 55)) c += `(${clean(l)}) Tj T* `;
  c += `/F1 12 Tf T* (${clean(authors)}) Tj T* T* (Sample PDF created by the papr setup script for testing.) Tj T* T* `;
  if (abstract) {
    c += `/F1 13 Tf (ABSTRACT) Tj T* /F1 11 Tf 15 TL `;
    for (const para of abstract.split(/\n+/)) { for (const l of wrap(para, 95)) c += `(${clean(l)}) Tj T* `; c += "T* "; }
  }
  c += "ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${c.length} >>\nstream\n${c}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n"; const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const PAPERS = [
  { status: "published", title: "Assessing Land Use and Land Cover Change in the Ashaiman Municipality Using Landsat Imagery (2000-2024)", abstract: "Rapid urbanisation in the Greater Accra Region has put pressure on farmland and wetlands around Ashaiman. This study used Landsat 7 and 8 imagery for 2000, 2012 and 2024 to map land use and land cover change. Images were classified with supervised maximum likelihood classification in ArcGIS into built-up, vegetation, bare land and water classes. Accuracy assessment gave overall accuracies above 85% for all three years.\n\nBuilt-up area grew from 21% of the municipality in 2000 to 63% in 2024, mainly at the expense of vegetation and wetland. Most growth followed the Tema Motorway corridor. The study recommends stronger enforcement of zoning and protection of remaining wetlands.", keywords: "remote sensing, GIS, urbanisation, Landsat, Ashaiman", field: "Earth & Environmental Sciences", type: "Final-year project", year: "2025", institution: "University of Mines and Technology (UMaT)", programme: "BSc Geomatic Engineering", authors: ["Kwame Asante", "Efua Boateng"], sup: "Dr. J. K. Annan", date: "2026-03-14", views: 412, downloads: 138 },
  { status: "published", title: "Mobile Money Adoption Among Market Traders in Kumasi Central Market", abstract: "Mobile money has grown quickly in Ghana, yet many informal traders still rely on cash. This study surveyed 220 traders at Kumasi Central Market to understand what drives or limits their use of mobile money for business. Using the Technology Acceptance Model, the study found that perceived usefulness and trust in agents were the strongest predictors of adoption. Transaction charges were the main reason given for limited use. The study suggests lower charges for small merchant transactions and more trader education by telcos.", keywords: "mobile money, informal sector, Kumasi, fintech", field: "Business & Economics", type: "Undergraduate thesis", year: "2025", institution: "Kwame Nkrumah University of Science and Technology (KNUST)", programme: "BSc Business Administration", authors: ["Yaw Owusu"], sup: "Mrs. A. Darko", date: "2026-02-02", views: 690, downloads: 251 },
  { status: "published", title: "Bacteriological Quality of Sachet Water Sold in the Cape Coast Metropolis", abstract: "Sachet water is the main drinking water source for many households and students in Cape Coast. Sixty samples from twelve brands were bought from vendors and tested for total coliforms, E. coli, pH and turbidity using standard methods. Eighteen percent of samples had coliforms above the Ghana Standards Authority limit, and samples stored in direct sunlight showed higher counts. All samples met pH limits. The study recommends regular market sampling by regulators and better storage practice by vendors.", keywords: "water quality, sachet water, coliform, public health", field: "Health Sciences", type: "Final-year project", year: "2025", institution: "University of Cape Coast (UCC)", programme: "BSc Laboratory Technology", authors: ["Abena Quaye", "Kofi Arthur"], sup: "Prof. E. Nkansah", date: "2026-04-20", views: 305, downloads: 97 },
  { status: "published", title: "Effect of Small-Scale Mining on Turbidity and Heavy Metal Levels in the Pra River Basin", abstract: "Illegal small-scale mining (galamsey) has changed the colour and quality of many rivers in the Western and Central regions. Water samples were collected at eight points along the Pra River in the dry and wet seasons and analysed for turbidity, mercury, lead and arsenic. Turbidity was up to forty times the WHO guideline downstream of active mining sites. Mercury exceeded guideline values at five of eight points. The findings support stricter enforcement and community-based river monitoring.", keywords: "galamsey, water quality, heavy metals, Pra River", field: "Earth & Environmental Sciences", type: "Final-year project", year: "2026", institution: "University of Mines and Technology (UMaT)", programme: "BSc Environmental and Safety Engineering", authors: ["Nana Ama Sarpong"], sup: "Dr. S. Ofori", date: "2026-06-05", views: 880, downloads: 322 },
  { status: "published", title: "Design of a Solar-Powered Cold Storage Unit for Tomato Farmers in the Upper East Region", abstract: "Tomato farmers in the Upper East Region lose a large share of their harvest because they lack cold storage. This project designed and tested a 2 cubic metre evaporative-assisted cold room powered by a 1.5 kW solar PV system. Over a three-week test, the unit kept produce between 8 and 12 degrees Celsius and extended tomato shelf life from 4 to 15 days. The estimated cost is GHS 18,500, which a farmer group could recover in about two seasons.", keywords: "solar energy, post-harvest loss, cold storage, tomatoes", field: "Engineering & Technology", type: "Final-year project", year: "2026", institution: "University for Development Studies (UDS)", programme: "BSc Agricultural Engineering", authors: ["Ibrahim Abdulai", "Mariam Seidu"], sup: "Ing. P. Azumah", date: "2026-07-11", views: 524, downloads: 201 },
  { status: "published", title: "A USSD-Based Market Price Information System for Smallholder Farmers", abstract: "Many smallholder farmers do not own smartphones and sell to middlemen without knowing current market prices. This project built a USSD service that lets farmers check daily prices of maize, yam, tomato and pepper at six major markets using any phone. Prices are entered by trained market reporters through a web dashboard. A pilot with 40 farmers in the Bono East Region found that 78% used the service weekly and most reported better negotiating power.", keywords: "USSD, agriculture, information systems, ICT4D", field: "Computing & IT", type: "Final-year project", year: "2025", institution: "Ashesi University", programme: "BSc Computer Science", authors: ["Esi Ankomah"], sup: "Dr. D. Ebo Adjepon", date: "2026-01-18", views: 733, downloads: 189 },
  { status: "published", title: "Student Perceptions of Blended Learning at the University of Education, Winneba", abstract: "After the COVID-19 period, many Ghanaian universities kept some online teaching. This study surveyed 310 undergraduate students at UEW about their experience of blended learning. Students valued recorded lectures and flexible schedules but reported high data costs and unstable internet as major barriers. Students in rural hostels were twice as likely to miss online sessions. The study recommends data bundles for students and offline-friendly course materials.", keywords: "blended learning, higher education, e-learning, Ghana", field: "Education", type: "Undergraduate thesis", year: "2025", institution: "University of Education, Winneba (UEW)", programme: "BEd Information Technology", authors: ["Selorm Agbeko"], sup: "Dr. M. Asamoah", date: "2026-05-09", views: 256, downloads: 74 },
  { status: "published", title: "Knowledge and Use of Insecticide-Treated Nets Among Pregnant Women in the Tamale Metropolis", abstract: "Malaria in pregnancy remains a major health concern in Northern Ghana. This cross-sectional study interviewed 180 pregnant women attending antenatal clinics in the Tamale Metropolis about their knowledge and use of insecticide-treated nets. While 92% knew that nets prevent malaria, only 61% slept under a net the previous night. Heat and lack of space were the main reasons for non-use. The study recommends practical counselling at antenatal visits.", keywords: "malaria, maternal health, ITN, Tamale", field: "Health Sciences", type: "Undergraduate thesis", year: "2026", institution: "University for Development Studies (UDS)", programme: "BSc Midwifery", authors: ["Fatima Mahama"], sup: "Mrs. R. Alhassan", date: "2026-08-22", views: 198, downloads: 66 },
  { status: "pending", title: "Mapping Flood-Prone Areas in Kumasi Using GIS-Based Multi-Criteria Analysis", abstract: "Flooding affects many communities in Kumasi every rainy season. This study combined rainfall, elevation, slope, soil, drainage density and land use layers in an analytical hierarchy process (AHP) to produce a flood susceptibility map. About 23% of the metropolis was classified as high or very high susceptibility, mainly along the Subin and Aboabo rivers. The map was checked against 45 recorded flood locations, with 82% falling in the high classes.", keywords: "flood, GIS, AHP, Kumasi", field: "Earth & Environmental Sciences", type: "Final-year project", year: "2026", institution: "Kwame Nkrumah University of Science and Technology (KNUST)", programme: "BSc Geomatic Engineering", authors: ["Prince Osei"], sup: "Dr. A. Fosu", date: "2026-11-18" },
  { status: "pending", title: "Customer Satisfaction with Ride-Hailing Services in Accra", abstract: "Ride-hailing apps have changed how people move in Accra. This study surveyed 150 regular users about price, safety, waiting time and driver behaviour. Safety and price were the most important factors for satisfaction, and many users switch between apps depending on surge pricing.", keywords: "ride-hailing, customer satisfaction, Accra", field: "Business & Economics", type: "Seminar / term paper", year: "2026", institution: "University of Ghana (UG)", programme: "BSc Administration (Marketing)", authors: ["Akosua Frimpong"], sup: "Mr. K. Badu", date: "2026-11-19" },
  { status: "changes", owner: "ama", title: "Assessment of Road Surface Defects Along the Tarkwa-Takoradi Highway", abstract: "Road defects increase travel time and vehicle costs. This study surveyed potholes, cracks and rutting along a 40 km section of the highway.", keywords: "roads, pavement, survey", field: "Engineering & Technology", type: "Seminar / term paper", year: "2026", institution: "University of Mines and Technology (UMaT)", programme: "BSc Geomatic Engineering", authors: ["Ama Mensah"], sup: "Dr. J. K. Annan", supEmail: "jkannan@umat.edu.gh", date: "2026-11-10", note: "Thank you for submitting. Please expand your abstract to describe your method and main results (at least 120 words), and add a few more keywords so other students can find your work." },
];

const TABLES = ["activity", "app_state", "feed_sources", "contact_requests", "awards", "campaigns", "read_events", "notifications", "follows", "opportunities", "topic_saves", "topic_ideas", "collections", "fingerprints", "decks", "events", "reviews", "authors", "versions", "submissions", "sessions", "login_codes", "emails", "users"];

async function main() {
  const reset = process.argv.includes("--reset");
  await run("PRAGMA foreign_keys = OFF");
  if (reset) {
    console.log("Deleting all tables...");
    for (const t of TABLES) await run(`DROP TABLE IF EXISTS ${t}`);
  }
  console.log("Creating tables...");
  await migrate(db, ROOT);
  for (const t of TABLES) await run(`DELETE FROM ${t}`);

  fs.mkdirSync(UPLOADS, { recursive: true });
  for (const f of fs.readdirSync(UPLOADS)) if (f.endsWith(".pdf")) fs.unlinkSync(path.join(UPLOADS, f));

  console.log("Creating accounts...");
  const now = iso(Date.now());
  const modId = id(), amaId = id();
  await run("INSERT INTO users (id,email,name,role,created_at) VALUES (?,?,?,?,?)", [modId, "moderator@papr.edu.gh", "Dr. Kofi Mensah", "moderator", now]);
  await run("INSERT INTO users (id,email,name,role,institution,programme,level,created_at) VALUES (?,?,?,?,?,?,?,?)", [amaId, "ama.mensah@st.umat.edu.gh", "Ama Mensah", "student", "University of Mines and Technology (UMaT)", "BSc Geomatic Engineering", "Level 400", now]);
  const lecturerId = id(), recruiterId = id();
  await run("INSERT INTO users (id,email,name,role,institution,programme,created_at,handle,headline) VALUES (?,?,?,?,?,?,?,?,?)", [lecturerId, "lecturer@umat.edu.gh", "Dr. J. K. Annan", "lecturer", "University of Mines and Technology (UMaT)", "Department of Geomatic Engineering", now, "jk-annan", "Senior Lecturer, Geomatic Engineering"]);
  await run("INSERT INTO users (id,email,name,role,created_at) VALUES (?,?,?,?,?)", [recruiterId, "recruiter@example.com", "Akua Boateng (example recruiter)", "reader", now]);
  await run("UPDATE users SET handle = ?, headline = ?, skills = ?, open_to_opps = 1, interests = ?, bio = ? WHERE id = ?", ["ama-mensah", "Geomatic Engineering student · GIS & remote sensing", "ArcGIS, QGIS, Python, Survey design, Remote sensing", "Earth & Environmental Sciences,Engineering & Technology", "Final-year Geomatic Engineering student at UMaT, interested in urban mapping and road infrastructure.", amaId]);
  const authorIds = new Map();
  async function authorUser(p) {
    const name = p.authors[0];
    if (authorIds.has(name)) return authorIds.get(name);
    const uid = id();
    const domain = { "University of Mines and Technology (UMaT)": "st.umat.edu.gh", "Kwame Nkrumah University of Science and Technology (KNUST)": "st.knust.edu.gh", "University of Ghana (UG)": "st.ug.edu.gh", "University of Cape Coast (UCC)": "stu.ucc.edu.gh", "University for Development Studies (UDS)": "st.uds.edu.gh", "University of Education, Winneba (UEW)": "st.uew.edu.gh", "Ashesi University": "ashesi.edu.gh", "University of Health and Allied Sciences (UHAS)": "st.uhas.edu.gh" }[p.institution] || "st.example.edu.gh";
    const handle = name.toLowerCase().replace(/[^a-z]+/g, "-");
    const skills = p.keywords.split(",").map((k) => k.trim()).slice(0, 3).join(", ");
    await run("INSERT INTO users (id,email,name,role,institution,programme,level,created_at,handle,headline,skills,open_to_opps,interests) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [uid, `${handle.replace(/-/g, ".")}@${domain}`, name, "student", p.institution, p.programme, "Recent graduate (within 2 years)", now, handle, `${p.programme.replace(/^BSc |^BEd /, "")} graduate`, skills, authorIds.size % 3 === 2 ? 0 : 1, p.field]);
    authorIds.set(name, uid);
    return uid;
  }

  console.log("Creating example papers...");
  let n = 0;
  for (const p of PAPERS) {
    n++;
    const num = String(n).padStart(4, "0");
    const ref = `PPR-2026-${num}`;
    const pdf = makePdf(p.title, p.authors.join(", "), p.abstract);
    const pdfPath = crypto.randomBytes(16).toString("hex") + ".pdf";
    fs.writeFileSync(path.join(UPLOADS, pdfPath), pdf);
    const when = new Date(p.date + "T09:00:00Z");
    const submitted = p.status === "published" ? iso(when.getTime() - 4 * 86400000) : iso(when);
    const published = p.status === "published" ? iso(when) : null;
    const sid = id();
    await run(
      `INSERT INTO submissions (id,ref,status,owner_id,title,abstract,keywords,authors_text,field,type,year,institution,programme,
        current_version,supervisor_name,supervisor_email,supervisor_confirmed_at,doi,views,downloads,published_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?)`,
      [sid, ref, p.status, p.owner === "ama" ? amaId : await authorUser(p), p.title, p.abstract, p.keywords, p.authors.join(", "), p.field, p.type, p.year,
        p.institution, p.programme, p.sup, p.supEmail || "supervisor@example.edu.gh", p.status === "published" && n % 2 === 1 ? submitted : null,
        p.status === "published" ? `${DOI_PREFIX}/papr.2026.${num}` : null, p.views || 0, p.downloads || 0, published, submitted, published || submitted]
    );
    await run("INSERT INTO versions (id,submission_id,number,title,abstract,keywords,pdf_path,pdf_name,pdf_size,declarations,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [id(), sid, 1, p.title, p.abstract, p.keywords, pdfPath, ref + ".pdf", pdf.length, JSON.stringify({ author: true, original: true, privacy: true, supervisor: true }), submitted]);
    for (const [i, name] of p.authors.entries()) await run("INSERT INTO authors (id,submission_id,name,position) VALUES (?,?,?,?)", [id(), sid, name, i]);
    await run("INSERT INTO events (id,submission_id,text,created_at) VALUES (?,?,?,?)", [id(), sid, "Submitted for moderation (version 1)", submitted]);
    if (p.status === "published") {
      await run("INSERT INTO reviews (id,submission_id,version_number,moderator_id,decision,checklist,similarity,created_at) VALUES (?,?,?,?,?,?,?,?)", [id(), sid, 1, modId, "publish", "{}", 3, published]);
      await run("INSERT INTO events (id,submission_id,text,created_at) VALUES (?,?,?,?)", [id(), sid, "Published with permanent link and DOI", published]);
    }
    if (p.status === "changes") {
      const at = iso(when.getTime() + 2 * 86400000);
      await run("INSERT INTO reviews (id,submission_id,version_number,moderator_id,decision,note,checklist,similarity,created_at) VALUES (?,?,?,?,?,?,?,?,?)", [id(), sid, 1, modId, "changes", p.note, "{}", 0, at]);
      await run("INSERT INTO events (id,submission_id,text,created_at) VALUES (?,?,?,?)", [id(), sid, "Moderator requested changes", at]);
    }
  }
  // ---- Lecturer collection (Ama's paper is in it) ----
  const collId = id();
  await run("INSERT INTO collections (id, slug, title, description, owner_id, institution, expected, deadline, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [collId, "umat-geomatic-fyp-2026", "UMaT Geomatic Engineering · Final-Year Projects 2026", "Upload your final report PDF after your defence. Use the department template, and check your references with the papr reference checker first.", lecturerId,
      "University of Mines and Technology (UMaT)", 40, iso(Date.now() + 30 * 86400000), now]);
  await run("UPDATE submissions SET collection_id = ? WHERE owner_id = ?", [collId, amaId]);

  // ---- Sample opportunities (clearly marked as samples) ----
  const day = (n) => iso(Date.now() + n * 86400000).slice(0, 10);
  const OPPS = [
    ["GIS and mapping intern (6 months)", "A mining company in the Western Region (sample)", "internship", "Earth & Environmental Sciences,Engineering & Technology", "Tarkwa", day(12), "Support mine surveying and GIS mapping. ArcGIS or QGIS experience required."],
    ["National service: Assistant Research Officer", "A national research institute (sample)", "national-service", "", "Accra", day(25), "Placement for graduates in any field interested in research and data collection."],
    ["Master's scholarship in Geospatial Science", "A university abroad (sample)", "scholarship", "Earth & Environmental Sciences,Computing & IT", "Remote / abroad", day(40), "Fully funded MSc for African students with a GIS or remote sensing background."],
    ["Graduate school application deadline: MS Geology", "A US public university (sample)", "grad-school", "Earth & Environmental Sciences,Natural Sciences", "USA", day(55), "Fall intake. Statement of purpose, 3 references and a writing sample needed."],
    ["Student research conference: call for abstracts", "A Ghanaian university (sample)", "conference", "", "Kumasi", day(8), "Present your final-year project. Best student paper wins a prize."],
    ["Junior data analyst", "A fintech start-up in Accra (sample)", "job", "Business & Economics,Computing & IT", "Accra", day(18), "Excel, SQL and a curious mind. Great for business and computing graduates."],
    ["Public health field assistant", "An NGO in the Northern Region (sample)", "job", "Health Sciences", "Tamale", day(20), "Data collection for a maternal health project."],
    ["Innovation challenge: solutions for smallholder farmers", "An agri-tech foundation (sample)", "grant", "Agriculture & Food,Engineering & Technology,Computing & IT", "Ghana", day(30), "Grants for student teams turning research into products."],
  ];
  for (const o of OPPS) await run("INSERT INTO opportunities (id, title, org, type, fields, location, deadline, url, description, sample, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)",
    [id(), o[0], o[1], o[2], o[3], o[4], o[5], "https://example.com/opportunity", o[6], modId, now]);

  // ---- An active Drop Week campaign, so the banner shows while testing ----
  await run("INSERT INTO campaigns (id, title, message, badge, starts_at, ends_at, created_at) VALUES (?,?,?,?,?,?,?)",
    [id(), "Drop Week", "Defended your project? Drop it on papr this week and earn the Drop Week badge.", "Drop Week 2026", iso(Date.now() - 2 * 86400000), iso(Date.now() + 5 * 86400000), now]);

  // ---- Reader activity for this month (for Paper of the Month and reader stats) ----
  const pubs = (await db.execute("SELECT id FROM submissions WHERE status = 'published'")).rows.map((r) => r.id);
  const insts = ["Kwame Nkrumah University of Science and Technology (KNUST)", "University of Ghana (UG)", "University of Cape Coast (UCC)", null, null];
  const countries = ["GH", "GH", "GH", "NG", "US", "GB", null];
  for (const [i, pid] of pubs.entries()) {
    for (let k = 0; k < 4 + ((i * 7) % 11); k++)
      await run("INSERT INTO read_events (id, submission_id, kind, reader_id, institution, country, created_at) VALUES (?,?,?,?,?,?,?)",
        [id(), pid, k % 3 ? "view" : "download", null, insts[(i + k) % insts.length], countries[(i * 3 + k) % countries.length], iso(Date.now() - (k % 9) * 86400000)]);
  }

  // ---- Paper of the Month for last month ----
  const lastMonth = new Date(); lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
  const pra = (await db.execute("SELECT id FROM submissions WHERE title LIKE 'Effect of Small-Scale Mining%'")).rows[0];
  if (pra) await run("INSERT INTO awards (id, month, submission_id, prize, sponsor, citation, created_at) VALUES (?,?,?,?,?,?,?)",
    [id(), lastMonth.toISOString().slice(0, 7), pra.id, "10 GB data bundle", "Example Telco", "Clear evidence on galamsey and river health", now]);

  // ---- Ama follows her field ----
  await run("INSERT INTO follows (user_id, kind, value, created_at) VALUES (?,?,?,?)", [amaId, "field", "Earth & Environmental Sciences", now]);

  await run("PRAGMA foreign_keys = ON");

  console.log(`\nDone. ${PAPERS.length} example papers created.\n`);
  console.log("Start the app with:  npm run dev");
  console.log("Then open:           http://localhost:3000\n");
  console.log("Test accounts (log in at http://localhost:3000/login):");
  console.log("  Student:   ama.mensah@st.umat.edu.gh");
  console.log("  Moderator: moderator@papr.edu.gh");
  console.log("  Lecturer:  lecturer@umat.edu.gh   (has a class collection)");
  console.log("  Recruiter: recruiter@example.com  (any non-.edu.gh email = reader account)");
  console.log("  Or use any email ending in .edu.gh to create a new student account.");
  console.log("  The login code appears on screen while SHOW_DEV_CODES is true.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
