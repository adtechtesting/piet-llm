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
      content: `Poornima Institute of Engineering & Technology (PIET) was established in 2007 with the aim of providing practical, industry-focused technical education. 
  In its 17+ year journey, PIET has achieved excellence in engineering education through continuous dedication and innovation. 
  With the motto 'Success is not a destination, it's a journey', PIET has become a leading institute in Jaipur.
  
  Key Highlights:
  - Ranked 4th by RTU
  - 17+ years of academic excellence
  - Large student and faculty community
  - State-of-the-art classrooms and labs
  - Multiple industry partners & research grants
  - Numerous published and granted patents`
    },
  
    {
      name: "piet_numbers.txt",
      content: `PIET In Numbers:
  
  - 4th Ranked by RTU
  - 0+ Students
  - 0+ Teachers and Staff
  - 0+ Years
  - 0+ MOU's
  - 0+ Industry Partners
  - 0+ Published Patents
  - 0+ Granted Patents
  - 1.70cr+ Research Grant Received
  - 0+ SCI/Scopus Publications
  - 0+ UGC Care Publications
  - 0+ State-of-Art Classrooms, Labs & Halls`
    },
  
    {
      name: "news_events.txt",
      content: `News & Recent Events:
  
  - 🎉 International Women's Day celebrated on 8th March 2025
  - 🩸 Blood Donation Camp organized on 10th March 2025
  - 🏃‍♂️ Poornima Marathon 2025 successfully held in Jaipur
  - 📢 Admissions Open for 2025-26 Batch - Apply Now!
  - 🧠 Special Seminar on Artificial Intelligence - 15th April 2025
  - 🌱 NSS Plantation Drive - 22nd April 2025`
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