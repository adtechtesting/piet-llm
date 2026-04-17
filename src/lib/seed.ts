import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import * as dotenv from "dotenv";


dotenv.config({ path: '.env.local' });

const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const PINECONE_API_KEY = getEnv("PINECONE_API_KEY");
const PINECONE_INDEX_NAME = getEnv("PINECONE_INDEX_NAME");
const documentData = [
  {
    name: "piet_overview.txt",
    content: `Poornima Institute of Engineering & Technology (PIET) was established in 2007 with the aim of imparting pragmatic technical education.
In its magnificent journey of 17+ years, PIET has set benchmarks and reached new pinnacles in Engineering Education with dedication, perseverance and devotion.
With the motto 'Success is not a destination, it's a journey', PIET is spearheading its outstanding voyage as a leading institute in Jaipur.

PIET is affiliated to Rajasthan Technical University (RTU), approved by AICTE, recognized under UGC 2(f), and accredited by NAAC with 'A' Grade (awarded 2025).

Key Highlights:
- Ranked 4th in annual QIV ranking by Rajasthan Technical University
- NAAC 'A' Grade Accredited (since 2019, reaffirmed 2025)
- Rated DIAMOND by QS-I Gauge (Platinum in 5 out of 8 parameters)
- Rated PLATINUM by AICTE-CII Survey for Industry Linked Technical Institutes
- 1st Institution in India to offer B.Tech CE in Indian Language under NEP 2020
- 1st private college in Rajasthan to receive NBA accreditation for B.Tech (Computer Engineering)
- First and only IDEA Lab in Rajasthan, funded by AICTE
- Center of Excellence for Advanced Digital Manufacturing (awarded by RTU)
- 17+ years of academic excellence
- ~1700 students, 77+ faculty members
- 936 sanctioned B.Tech seats
- State-of-the-art classrooms, labs (REDHAT Lab, ORACLE Lab, Neural Network & Deep Learning Lab, etc.)
- 40+ Industry & Academia MOU partners
- Placement rate of 75%+ annually; average package ₹5.5 LPA; highest package ₹45 LPA (Amazon, 2023)
- Poornima Business Incubation Cell (PBIC): 41 startups nurtured, 18 registered with Government bodies
- Located at ISI-2, RIICO Institutional Area, Goner Road, Sitapura, Jaipur – 302022`
  },

  {
    name: "piet_numbers.txt",
    content: `PIET In Numbers:

- 4th Ranked by RTU (QIV Annual Ranking)
- ~1700 Students
- 77+ Teachers and Staff
- 17+ Years of Excellence (Est. 2007)
- 40+ MOUs (Industry & Academia)
- 40+ Industry Partners
- 140+ Published Patents
- 10+ Granted Patents
- ₹1.98 Crore+ Research Grant Received (last 6 years)
- 723+ Total Journal Publications (last 6 years)
- 340+ SCI/Scopus Indexed Publications
- UGC Care Publications (ongoing)
- 936 Sanctioned B.Tech Seats
- 8 B.Tech Specializations offered
- 75%+ Students Placed Annually
- ₹5.5 LPA Average Package
- ₹45 LPA Highest Package (Amazon, 2023)
- 41 Startups Incubated via PBIC (18 govt. registered)
- State-of-the-Art Classrooms, Labs & Halls`
  },

  {
    name: "piet_programs.txt",
    content: `B.Tech Specializations (UG Level):

1. Artificial Intelligence and Data Science
2. Computer Engineering
3. Computer Science & Engineering (Artificial Intelligence)
4. Computer Science and Engineering (Data Science)
5. Computer Science and Engineering (Internet of Things)
6. Electrical Engineering
7. Electronics & Communication Engineering
8. Computer Engineering (Indian Language) — 1st in India under NEP 2020

Admission:
- Via JEE Main / REAP Counselling (Rajasthan government)
- Minimum 60% in Class 12th (PCM)
- Direct admission also available`
  },

  {
    name: "piet_accreditations.txt",
    content: `Accreditations & Rankings:

- NAAC 'A' Grade — Accredited since 2019, reaffirmed in 2025
- NBA Accreditation — B.Tech (Computer Engineering) for 6+ years; B.Tech (Civil Engineering) in 2019-20
- AICTE Approved & MHRD Recognized
- UGC Recognized under Section 2(f)
- Affiliated to Rajasthan Technical University (RTU)
- Ranked 4th by RTU (QIV Annual Ranking)
- DIAMOND Rating by QS-I Gauge (Platinum in 5/8 parameters)
- PLATINUM Rating by AICTE-CII Survey (Industry Linked Technical Institutes)
- Center of Excellence for Advanced Digital Manufacturing (by RTU)`
  },

  {
    name: "piet_labs_infrastructure.txt",
    content: `Labs & Infrastructure:

- First and only AICTE-funded IDEA Lab in Rajasthan
- Neural Network & Deep Learning Lab (AICTE-MODROB funded)
- REDHAT Lab
- ORACLE Lab
- Advanced Digital Manufacturing Lab (Center of Excellence)
- Smart/Digital Classrooms with digital & white boards
- Comprehensive Digital Library
- Well-maintained Boys & Girls Hostels (AC & Non-AC options)
- Campus Canteen
- Sports Grounds & Extracurricular Facilities
- Campus Area: 5.03 acres
- Wi-Fi enabled campus`
  },

  {
    name: "piet_placements.txt",
    content: `Placements & Industry Connect:

- 75%+ students placed every year
- Average Package: ₹5.5 LPA
- Highest Package: ₹45 LPA (Amazon, 2023)
- Dedicated Training & Placement Cell
- 40+ Industry & Academia Partners
- Internships, industrial visits & campus recruitment drives
- Poornima Business Incubation Cell (PBIC):
  - 41 startups incubated
  - 18 startups registered with Government bodies`
  },

  {
    name: "piet_research.txt",
    content: `Research & Innovation:

- 723+ research papers published in reputed journals (last 6 years)
- 340+ SCI & Scopus Indexed publications
- ₹1.98 crore total research grants received (last 6 years)
- 140+ patents published by students & faculty
- 10+ patents granted
- Dedicated IPR Cell
- IDEA Lab (first & only in Rajasthan, AICTE-funded)
- Strong entrepreneurship support via PBIC`
  },

  {
    name: "news_events.txt",
    content: `News & Recent Events:

- 🎉 International Women's Day celebrated on 8th March 2025
- 🩸 Blood Donation Camp organized on 10th March 2025
- 🏆 Poornima Marathon 2025 successfully held at Jaipur
- 📢 Admissions Open for 2025-26 Batch - Apply Now!
- 📚 Special Seminar on Artificial Intelligence - 15th April 2025
- 🌳 NSS Plantation Drive - 22nd April 2025`
  },

  {
    name: "notices_2025_26.txt",
    content: `Notices for 2025-26:

- Circular - Publication of Academic & Examination Policy for Autonomous
- First Year Syllabus (Autonomous)
- Important Contact Details Kit
- Student Registration Form 2025-26
- Anti-Ragging Hotlines
- Poornima Express 2024-25 (Dept. of Applied Sciences)`
  },

  {
    name: "notices_2024_25.txt",
    content: `Notices for 2024-25:

- SEDGs
- Anti-Ragging Notice 2024-25
- Notification for Equal Opportunity Cell
- Notification for Artist/Artisans in Residence Cell
- SGRC 2024-25
- Constitution of Internal Complaint Committee`
  },

  {
    name: "notices_2023_24.txt",
    content: `Notices for 2023-24:

- Minority Cell 2023-24
- Anti-Ragging Notice 2023-24
- ISTE Student Awards 2023 Notifications
- SC-ST-OBC Grievance Cell 2023-24
- SGRC 2023-24
- ICC 2023-24`
  },

  {
    name: "notices_2022_23.txt",
    content: `Notices for 2022-23:

- Enrollment Notice for Open Category & Bio Data Form 2022-23
- Second Mid Term Debarred Notice (B.Tech II Sem)
- Anti-Ragging Notice 2022-23
- Notice for Branch Change (B.Tech I Year to II Year)
- RTU Revaluation for B.Tech VII-Semester
- Suspension Notice - HIMANSHU RANA
- Renewal Scholarship Notice under PMSSS 2022-23
- Reschedule Notice for B.Tech III & V Sem Examination 2022-23`
  },

  {
    name: "notices_2021_22.txt",
    content: `Notices for 2021-22:

- Branch Change Session 2021-22
- Debarred Notice for B.Tech IV Sem
- Anti-Ragging Notice 2021-22
- Constitution of Internal Complaints Committee
- Suspension Letter (Admin 21-22)
- Library Book Submission Notice
- VIII Sem Debarred List`
  },

  {
    name: "notices_2020_21.txt",
    content: `Notices for 2020-21:

- British Council Scholarship for Women in STEM
- Celebration of Gandhi Jayanti & Shastri Jayanti
- Formation of SC-ST-OBC Monitoring Cell
- Minority Notice 2020-21
- Centre City Change for B.Tech I & III Sem
- Revised First Midterm Time Table (B.Tech II Sem)
- RTU Examination Notices for II & IV Semesters
- VIII Semester Examination Guidelines`
  },

  {
    name: "notices_2019_20.txt",
    content: `Notices for 2019-20:

- Notice for Branch Change 2019-20
- RTU Revaluation Notice (B.Tech I-Sem)
- RTU Revaluation Notice (B.Tech V-Sem)
- Blood Donation Report 05.09.19
- Uploads for Lockdown Period`
  },

  {
    name: "notices_2018_19.txt",
    content: `Notices for 2018-19:

- Appointment as Coordinator for Club Activities
- Appointment as Incharge for Website Updates
- Blood Donation Camp Notice
- B.Tech VI Sem Exam Notice
- Submission of Examination & Improvement Forms Notice`
  }
];





async function main() {
  console.log("Starting seeding process...");

  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

 
    console.log(`Checking if index "${PINECONE_INDEX_NAME}" exists...`);
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating index "${PINECONE_INDEX_NAME}"...`);
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 384, 
        metric: "cosine",
        spec: { serverless: { cloud: 'aws', region: 'us-east-1' } }
      });
      console.log(`Index created. Waiting for it to be ready...`);
      await new Promise(resolve => setTimeout(resolve, 60000)); 
    } else {
      console.log(`Index "${PINECONE_INDEX_NAME}" already exists.`);
    }

    const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
    const embeddings = new HuggingFaceTransformersEmbeddings({ modelName: "Xenova/all-MiniLM-L6-v2" });

    const documents = documentData.map(doc => new Document({
      pageContent: doc.content,
      metadata: { source: doc.name },
    }));

    console.log("Uploading documents to Pinecone...");
    await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex,
      namespace: "piet-info",
    });

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

main();
