require('dotenv').config();  // load .env file

const admin = require('firebase-admin');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');


admin.initializeApp({
    credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS))
  });

const db = admin.firestore();

// 📂 FOLDER WHERE YOUR CSV FILES LIVE

const CSV_FOLDER_PATH = path.resolve(process.env.CSV_FOLDER);

// 🛠️ COLLECTION NAME
const COLLECTION_NAME = 'scheduled_volunteers';

// 🏃‍♂️ FUNCTION TO PROCESS A SINGLE CSV FILE
async function processCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const batch = db.batch();
    const records = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Clean up and normalize fields
        const record = {
            first_name: data['First Name'] || '',
            last_name: data['Last Name'] || '',
            shift: data['Shift'] || '',
            date: data['Day'] || '',  // <- your sheet might say Day instead of Date
            assignment: data['Floor'] || '',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          };
        records.push(record);
      })
      .on('end', async () => {
        try {
          records.forEach((record) => {
            const docRef = db.collection(COLLECTION_NAME).doc();
            batch.set(docRef, record);
          });
          await batch.commit();
          console.log(`✅ Successfully uploaded ${records.length} records from ${path.basename(filePath)}`);
          resolve();
        } catch (error) {
          console.error(`❌ Error uploading ${path.basename(filePath)}: `, error);
          reject(error);
        }
      });
  });
}

// 🚀 MAIN FUNCTION TO PROCESS ALL CSV FILES
async function uploadAllCSVs() {
  try {
    const files = fs.readdirSync(CSV_FOLDER_PATH).filter(file => file.endsWith('.csv'));

    for (const file of files) {
      const filePath = path.join(CSV_FOLDER_PATH, file);
      await processCSVFile(filePath);
    }

    console.log('🎉 All files processed successfully!');
  } catch (error) {
    console.error('❌ Error during batch upload:', error);
  }
}

uploadAllCSVs();
