
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// Helper to extract data from Firestore document fields
function extractDocumentData(fields: any): any {
  if (!fields) return {};

  const result: any = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = extractFieldValue(value);
  }
  return result;
}

// Helper to extract value from Firestore field value
function extractFieldValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.arrayValue !== undefined) {
    return value.arrayValue.values?.map((v: any) => extractFieldValue(v)) || [];
  }
  if (value.mapValue !== undefined) {
    return extractDocumentData(value.mapValue.fields);
  }
  if (value.timestampValue !== undefined) {
    return new Date(value.timestampValue).getTime();
  }
  return value;
}

// Helper to convert data to Firestore fields
function convertToFirestoreFields(data: any): any {
  const fields: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            return { stringValue: String(v) };
          })
        }
      };
    }
  }
  
  return fields;
}

class FirestoreStorage {
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      console.log('🔍 Searching for user with email:', email);
      
      const body = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email }
            }
          },
          limit: 1
        }
      };

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        console.error(`Firestore API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0 && data[0].document) {
        const doc = data[0].document;
        const userData = {
          uid: doc.name.split('/').pop(),
          ...extractDocumentData(doc.fields)
        };
        console.log('✅ Found user:', userData.uid);
        return userData;
      }

      console.log('❌ No user found with email:', email);
      return null;
    } catch (error: any) {
      console.error("Error getting user by email:", error?.message);
      return null;
    }
  }

  async updateUser(uid: string, data: any): Promise<void> {
    try {
      console.log('📝 Updating user:', uid, 'with data:', data);
      
      const fields = convertToFirestoreFields(data);
      
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": FIREBASE_API_KEY || ""
          },
          body: JSON.stringify({ fields })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Firestore update error: ${response.status} ${errorText}`);
        throw new Error(`Failed to update user: ${response.status}`);
      }

      console.log('✅ User updated successfully');
    } catch (error: any) {
      console.error("Error updating user:", error?.message);
      throw error;
    }
  }
}

export const storage = new FirestoreStorage();
export type { InsertUser, User } from "@shared/schema";
